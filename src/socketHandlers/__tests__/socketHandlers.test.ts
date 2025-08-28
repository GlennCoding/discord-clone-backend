/**
 * First: Connect server & client socket (beforeAll)
 * 1) Get a token
 * - /register & /login via super-test
 * 2) connect server from app with token
 *
 * After all:
 * - close server & client socket
 *
 * Test (should work):
 * - Random test -> Check beforeAll
 *
 */

import { type AddressInfo } from "node:net";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { server, io, app } from "../../app";
import request from "supertest";
import { setupMongoDB, teardownMongoDB } from "../../__tests__/setup";
import User, { IUser } from "../../models/User";
import { EVENTS } from "../../utils/events";
import { IMessageAPI } from "../onConnection";
import Message from "../../models/Message";
import { promisify } from "node:util";

let user1Token: string, user1: IUser | null, chatId: string;
let user2Token: string, user2: IUser | null;
const user1Data = { userName: "John", password: "Cena" };
const user2Data = { userName: "Nama", password: "Rupa" };

beforeAll(async () => {
  await setupMongoDB();

  // Create user 1
  await request(app).post("/register").send(user1Data);
  const loginRes = await request(app).post("/login").send(user1Data);
  user1Token = loginRes.body.token;

  // Create user 2
  await request(app).post("/register").send(user2Data);
  const loginRes2 = await request(app).post("/login").send(user2Data);
  user2Token = loginRes2.body.token;

  // Create chat room
  const createChatRes = await request(app)
    .post("/chat")
    .send({ participant: user2Data.userName })
    .set("Authorization", `Bearer ${user1Token}`);
  chatId = createChatRes.body.chatId;

  user1 = await User.findOne({ userName: user1Data.userName });
});

afterAll(async () => {
  await teardownMongoDB();
});

describe("web sockets", () => {
  let user2Socket: ClientSocket;
  let user1Socket: ClientSocket;

  beforeAll(async () => {
    await promisify(server.listen).call(server);
    const port = (server.address() as AddressInfo).port;

    const createSocket = (token: string) =>
      ioc(`http://localhost:${port}`, {
        auth: { token },
        reconnectionAttempts: 5,
        transports: ["websocket"],
      });

    const connectClientSocket = (clientSocket: ClientSocket) =>
      new Promise((resolve, reject) => {
        clientSocket.on("connect", () => resolve("Connection successful"));

        clientSocket.on("connect_error", (e) => reject(e));
      });

    user1Socket = createSocket(user1Token);
    user2Socket = createSocket(user2Token);

    await Promise.all([
      connectClientSocket(user1Socket),
      connectClientSocket(user2Socket),
    ]);
  });

  afterAll(async () => {
    await io.close();
    user1Socket.disconnect();
  });

  afterEach(() => {
    user1Socket.removeAllListeners();
  });

  it("should make clients joining a chat work", () =>
    new Promise((done) => {
      user1Socket.on(EVENTS["CHAT_MESSAGES"], ({ participant, messages }) => {
        expect(participant).toBe(user2Data.userName);
        expect(messages).toEqual([]);
        done(true);
      });
      user1Socket.emit(EVENTS["CHAT_JOIN"], chatId);
    }));

  it("should make a client send a message", () =>
    new Promise((done) => {
      const messagePayload = { chatId, text: "Hello World" };

      user1Socket.on(EVENTS["CHAT_NEW_MESSAGE"], (res: IMessageAPI) => {
        expect(res).toEqual({
          message: {
            id: expect.any(String),
            text: messagePayload.text,
            chatId,
            createdAt: expect.any(String),
            sender: "self",
          } as IMessageAPI,
        });
        done(true);
      });
      user1Socket.emit(EVENTS["CHAT_JOIN"], chatId);
      user1Socket.emit(EVENTS["CHAT_NEW_MESSAGE"], messagePayload);
    }));

  it("should load messages when entering chat", async () => {
    await Message.create({
      chat: chatId,
      sender: user1!.id,
      text: "Hello World",
    });

    await new Promise((resolve) => {
      user1Socket.on(EVENTS["CHAT_MESSAGES"], (s) => {
        console.log(s);
        resolve({});
      });

      user1Socket.emit(EVENTS["CHAT_JOIN"], chatId);
    });
  }, 15000);

  it("should throw 400 on missing inputs", async () => {
    await new Promise((resolve) => {
      user1Socket.on(EVENTS["CHAT_ERROR"], (e) => {
        expect(e).toEqual({ error: "Missing text" });
        resolve({});
      });

      user1Socket.emit(EVENTS["CHAT_JOIN"], chatId);
      user1Socket.emit(EVENTS["CHAT_NEW_MESSAGE"], { chatId, text: "" });
    });
  });

  it("should load and receive messages from the other chat participant", () => {});

  it("disallow users to join and message in a chat that they are not part of", () => {});
});
