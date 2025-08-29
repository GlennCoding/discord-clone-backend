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
import {
  ERROR_STATUS,
  EVENT_ERROR,
  EVENT_SUCCESS,
  EVENTS,
} from "../../utils/events";
import { IMessageAPI } from "../onConnection";
import Message from "../../models/Message";
import { promisify } from "node:util";

type UserData = {
  userName: string;
  password: string;
};

const user1Data: UserData = { userName: "John", password: "Cena" };
const user2Data: UserData = { userName: "Nama", password: "Rupa" };
const user3Data: UserData = { userName: "Bob", password: "Baumeister" };

let user1Token: string, user1: IUser;
let user2Token: string, user2: IUser;
let user3Token: string, user3: IUser;

let chatId: string;

beforeAll(async () => {
  await setupMongoDB();

  const createUser = async (userData: UserData): Promise<IUser> => {
    await request(app).post("/register").send(userData);
    const user = await User.findOne({ userName: userData.userName });
    if (user === null) throw Error("User not found");
    return user;
  };

  const getUserToken = async (userData: UserData): Promise<string> => {
    const loginRes = await request(app).post("/login").send(userData);
    return loginRes.body.token;
  };

  const createChat = async (
    userToken: string,
    participant: string
  ): Promise<string> => {
    const res = await request(app)
      .post("/chat")
      .send({ participant })
      .set("Authorization", `Bearer ${userToken}`);
    return res.body.chatId;
  };

  user1 = await createUser(user1Data);
  user1Token = await getUserToken(user1Data);

  user2 = await createUser(user2Data);
  user2Token = await getUserToken(user2Data);

  user3 = await createUser(user3Data);
  user3Token = await getUserToken(user3Data);

  chatId = await createChat(user1Token, user2Data.userName);
});

afterAll(async () => {
  await teardownMongoDB();
});

describe("web sockets", () => {
  let user1Socket: ClientSocket;
  let user2Socket: ClientSocket;
  let user3Socket: ClientSocket;

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
    user3Socket = createSocket(user3Token);

    await Promise.all([
      connectClientSocket(user1Socket),
      connectClientSocket(user2Socket),
      connectClientSocket(user3Socket),
    ]);
  });

  afterAll(async () => {
    await io.close();
    user1Socket.disconnect();
  });

  afterEach(async () => {
    user1Socket.removeAllListeners();
    user2Socket.removeAllListeners();
    user3Socket.removeAllListeners();
    await Message.deleteMany({});
  });

  it("should make client joining a chat work", () => async () => {
    const res: EVENT_SUCCESS<{ participant: string; messages: IMessageAPI[] }> =
      await user1Socket.emitWithAck(EVENTS["CHAT_JOIN"], chatId);

    expect(res.data.participant).toBe(user2Data.userName);
    expect(res.data.messages).toEqual([]);
  });

  it("should make a client send a message", () => async () => {
    await user1Socket.emitWithAck(EVENTS["CHAT_JOIN"], chatId);

    const messagePayload = { chatId, text: "Hello World" };
    const newMessageAck: EVENT_SUCCESS<{ message: IMessageAPI }> =
      await user1Socket.emitWithAck(EVENTS["CHAT_NEW_MESSAGE"], messagePayload);

    expect(newMessageAck.status).toBe("OK");
    expect(newMessageAck.data).toEqual({
      message: {
        id: expect.any(String),
        text: messagePayload.text,
        chatId,
        createdAt: expect.any(String),
        sender: "self",
      } as IMessageAPI,
    });
  });

  it("should load messages when entering chat", async () => {
    await Message.create({
      chat: chatId,
      sender: user1.id,
      text: "Hello World",
    });
    await Message.create({
      chat: chatId,
      sender: user2.id,
      text: "Hello World 2",
    });

    await new Promise((resolve) => {
      const callback = (
        res: EVENT_SUCCESS<{ participant: string; messages: IMessageAPI[] }>
      ) => {
        const {
          data: { participant, messages },
        } = res;
        expect(participant).toBe(user2Data.userName);
        expect(messages[0]).toEqual(
          expect.objectContaining({
            text: "Hello World",
            sender: "self",
          } as Pick<IMessageAPI, "text" | "sender">)
        );
        expect(messages[1]).toEqual(
          expect.objectContaining({
            text: "Hello World 2",
            sender: "other",
          } as Pick<IMessageAPI, "text" | "sender">)
        );
        resolve({});
      };

      user1Socket.emit(EVENTS["CHAT_JOIN"], chatId, callback);
    });
  });

  it("should throw error on missing inputs", async () => {
    await new Promise(async (resolve) => {
      const callback = (ack: EVENT_ERROR) => {
        expect(ack).toEqual({
          error: ERROR_STATUS["BAD_REQUEST"],
          message: "Text input is missing",
        } as EVENT_ERROR);

        resolve(true);
      };

      user1Socket.emit(EVENTS["CHAT_JOIN"], chatId, () => {});

      user1Socket.emit(
        EVENTS["CHAT_NEW_MESSAGE"],
        {
          chatId,
          text: "",
        },
        callback
      );
    });
  });

  it("makes user2 receive messages form user1", async () => {
    await new Promise((resolve) => {
      user2Socket.on(
        EVENTS["CHAT_NEW_MESSAGE"],
        ({ message }: { message: IMessageAPI }) => {
          expect(message.text).toBe("Hello User2");
          expect(message.sender).toEqual("other");
          resolve({});
        }
      );

      user1Socket.emit(EVENTS["CHAT_JOIN"], chatId, () => {});
      user2Socket.emit(EVENTS["CHAT_JOIN"], chatId, () => {});

      user1Socket.emit(
        EVENTS["CHAT_NEW_MESSAGE"],
        { chatId, text: "Hello User2" },
        () => {}
      );
    });
  });

  it("makes user1 receive messages form user2", async () => {
    await new Promise((resolve) => {
      user1Socket.on(
        EVENTS["CHAT_NEW_MESSAGE"],
        ({ message }: { message: IMessageAPI }) => {
          expect(message.text).toBe("Hello User1");
          expect(message.sender).toEqual("other");
          resolve({});
        }
      );

      user1Socket.emit(EVENTS["CHAT_JOIN"], chatId, () => {});
      user2Socket.emit(EVENTS["CHAT_JOIN"], chatId, () => {});

      user2Socket.emit(
        EVENTS["CHAT_NEW_MESSAGE"],
        { chatId, text: "Hello User1" },
        () => []
      );
    });
  });

  it("disallow users to join and message in a chat that they are not part of", async () => {
    await new Promise((resolve, reject) => {
      user3Socket.emit(EVENTS["CHAT_JOIN"], chatId, (ack: EVENT_ERROR) => {
        if (ack.error !== ERROR_STATUS["UNAUTHORIZED"]) return reject(ack);

        expect(ack).toEqual({
          error: ERROR_STATUS["UNAUTHORIZED"],
          message: "You're not part of this chat",
        } as EVENT_ERROR);

        resolve({});
      });
    });
  });
});
