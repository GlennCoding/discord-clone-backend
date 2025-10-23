import request from "supertest";
import { type AddressInfo } from "node:net";
import { io as ioc } from "socket.io-client";
import { app, io, server } from "../../app";
import { setupMongoDB, teardownMongoDB } from "../../__tests__/setup";
import User, { IUser } from "../../models/User";
import { ERROR_STATUS, EVENT_ERROR } from "../../types/events";
import Message from "../../models/Message";
import { promisify } from "node:util";
import { issueAuthToken } from "../../services/authService";
import { TypedClientSocket } from "../../types/sockets";
import { MessageDTO } from "../../types/dto";

type UserData = {
  userName: string;
  password: string;
};

const createUserAndToken = async ({
  userName,
  password,
}: UserData): Promise<[IUser, string]> => {
  const user = new User({ userName, password });
  await user.save();
  const token = issueAuthToken(user);
  return [user, token];
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

const createSocket = (port: number, token: string) =>
  ioc(`http://localhost:${port}`, {
    auth: { token },
    reconnectionAttempts: 5,
    transports: ["websocket"],
  });

const connectClientSocket = (clientSocket: TypedClientSocket) =>
  new Promise((resolve, reject) => {
    clientSocket.on("connect", () => resolve("Connection successful"));

    clientSocket.on("connect_error", (e) => reject(e));
  });

describe("chat socket handlers", () => {
  const user1Data: UserData = { userName: "John", password: "Cena" };
  const user2Data: UserData = { userName: "Nama", password: "Rupa" };
  const user3Data: UserData = { userName: "Bob", password: "Baumeister" };

  let user1Token: string, user1: IUser, user1Socket: TypedClientSocket;
  let user2Token: string, user2: IUser, user2Socket: TypedClientSocket;
  let user3Token: string, user3: IUser, user3Socket: TypedClientSocket;

  let user1User2chatId: string;

  beforeAll(async () => {
    await setupMongoDB();

    // Create Users
    [user1, user1Token] = await createUserAndToken(user1Data);
    [user2, user2Token] = await createUserAndToken(user2Data);
    [user3, user3Token] = await createUserAndToken(user3Data);

    user1User2chatId = await createChat(user1Token, user2Data.userName);

    // Create & Connect User Sockets
    await promisify(server.listen).call(server);
    const port = (server.address() as AddressInfo).port;

    user1Socket = createSocket(port, user1Token);
    user2Socket = createSocket(port, user2Token);
    user3Socket = createSocket(port, user3Token);

    // Wait for all Sockets to be connected
    await Promise.all([
      connectClientSocket(user1Socket),
      connectClientSocket(user2Socket),
      connectClientSocket(user3Socket),
    ]);
  });

  afterAll(async () => {
    user1Socket.disconnect();
    user2Socket.disconnect();
    user3Socket.disconnect();
    await io.close();
    await new Promise((r) => server.close(r));
    await teardownMongoDB();
  });

  afterEach(async () => {
    user1Socket.removeAllListeners();
    user2Socket.removeAllListeners();
    user3Socket.removeAllListeners();
    await Message.deleteMany({});
  });

  it("should make client joining a chat work", async () => {
    const ack = await user1Socket.emitWithAck("chat:join", user1User2chatId);

    if (ack instanceof EVENT_ERROR) throw new Error(ack.message);

    expect(ack.data.participant).toBe(user2Data.userName);
    expect(ack.data.messages).toEqual([]);
  });

  it("should make a client send a message", async () => {
    await user1Socket.emitWithAck("chat:join", user1User2chatId);

    const messagePayload = { chatId: user1User2chatId, text: "Hello World" };
    const ack = await user1Socket.emitWithAck("message:send", messagePayload);

    if (ack instanceof EVENT_ERROR) throw new Error(ack.message);

    expect(ack.status).toBe("OK");
    expect(ack.data).toEqual({
      message: {
        id: expect.any(String),
        text: messagePayload.text,
        chatId: user1User2chatId,
        createdAt: expect.any(String),
        sender: "self",
      } as MessageDTO,
    });
  });

  it("should load messages when entering chat", async () => {
    await Message.create({
      chat: user1User2chatId,
      sender: user1.id,
      text: "Hello World",
    });
    await Message.create({
      chat: user1User2chatId,
      sender: user2.id,
      text: "Hello World 2",
    });

    const ack = await user1Socket.emitWithAck("chat:join", user1User2chatId);

    if (ack instanceof EVENT_ERROR) throw new Error(ack.message);

    const {
      data: { participant, messages },
    } = ack;

    expect(participant).toBe(user2Data.userName);
    expect(messages[0]).toEqual(
      expect.objectContaining({
        text: "Hello World",
        sender: "self",
      } as Pick<MessageDTO, "text" | "sender">)
    );
    expect(messages[1]).toEqual(
      expect.objectContaining({
        text: "Hello World 2",
        sender: "other",
      } as Pick<MessageDTO, "text" | "sender">)
    );
  });

  it("should throw error on missing inputs", async () => {
    await user1Socket.emitWithAck("chat:join", user1User2chatId);

    const ack = await user1Socket.emitWithAck("message:send", {
      chatId: user1User2chatId,
      text: "",
    });

    expect(ack).toEqual({
      error: ERROR_STATUS["BAD_REQUEST"],
      message: "Text input is missing",
    } as EVENT_ERROR);
  });

  it("disallow users to join and message in a chat that they are not part of", async () => {
    const ack = await user3Socket.emitWithAck("chat:join", user1User2chatId);

    expect(ack).toEqual({
      error: ERROR_STATUS["UNAUTHORIZED"],
      message: "You're not part of this chat",
    } as EVENT_ERROR);
  });

  it("makes user2 receive messages from user1", async () => {
    await new Promise(async (resolve) => {
      user2Socket.once("message:new", ({ message }: { message: MessageDTO }) => {
        expect(message.text).toBe("Hello User2");
        expect(message.sender).toEqual("other");
        resolve({});
      });

      await user1Socket.emitWithAck("chat:join", user1User2chatId);
      await user2Socket.emitWithAck("chat:join", user1User2chatId);

      user1Socket.emit(
        "message:send",
        { chatId: user1User2chatId, text: "Hello User2" },
        () => {}
      );
    });
  });

  it("makes user1 receive messages from user2", async () => {
    await new Promise(async (resolve) => {
      user1Socket.once("message:new", ({ message }: { message: MessageDTO }) => {
        expect(message.text).toBe("Hello User1");
        expect(message.sender).toEqual("other");
        resolve({});
      });

      await user1Socket.emitWithAck("chat:join", user1User2chatId);
      await user2Socket.emitWithAck("chat:join", user1User2chatId);

      user2Socket.emit(
        "message:send",
        { chatId: user1User2chatId, text: "Hello User1" },
        () => []
      );
    });
  });
});
