import request from "supertest";
import { app } from "../../app";
import User, { IUser } from "../../models/User";
import { ERROR_STATUS, EVENT_ERROR } from "../../types/sockets";
import Message from "../../models/ChatMessage";
import { issueAccessToken } from "../../services/authService";
import { TypedClientSocket } from "../../types/sockets";
import { MessageDTO } from "../../types/dto";
import { buildAccessTokenCookie } from "../../__tests__/helpers/cookies";
import {
  acquireSocketServer,
  releaseSocketServer,
  connectSocketWithToken,
} from "./helpers/socketTestUtils";

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
  const token = issueAccessToken(user);
  return [user, token];
};

const createChat = async (
  userToken: string,
  participant: string
): Promise<string> => {
  const res = await request(app)
    .post("/chat")
    .send({ participant })
    .set("Cookie", [buildAccessTokenCookie(userToken)]);
  return res.body.chatId;
};

beforeAll(async () => {
  await acquireSocketServer();
});

afterAll(async () => {
  await releaseSocketServer();
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
    // Create Users
    [user1, user1Token] = await createUserAndToken(user1Data);
    [user2, user2Token] = await createUserAndToken(user2Data);
    [user3, user3Token] = await createUserAndToken(user3Data);

    user1User2chatId = await createChat(user1Token, user2Data.userName);

    // Create & Connect User Sockets
    user1Socket = await connectSocketWithToken(user1Token);
    user2Socket = await connectSocketWithToken(user2Token);
    user3Socket = await connectSocketWithToken(user3Token);
  });

  afterAll(async () => {
    user1Socket.disconnect();
    user2Socket.disconnect();
    user3Socket.disconnect();
    await User.deleteMany({});
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

    expect(ack.data.participant.username).toBe(user2Data.userName);
    expect(ack.data.messages).toEqual([]);
  });

  it("should make a client send a message", async () => {
    await user1Socket.emitWithAck("chat:join", user1User2chatId);

    const messagePayload = { chatId: user1User2chatId, text: "Hello World" };
    const ack = await user1Socket.emitWithAck("message:send", messagePayload);

    if (ack instanceof EVENT_ERROR) throw new Error(ack.message);

    expect(ack.status).toBe("OK");
    expect(ack.data.message).toEqual({
      id: expect.any(String),
      text: messagePayload.text,
      chatId: user1User2chatId,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      sender: {
        id: user1._id.toString(),
        username: user1.userName,
        avatarUrl: user1.avatar?.url,
      },
      attachments: [],
    } as MessageDTO);
  });

  it("should load messages when entering chat", async () => {
    const user1Message = {
      chat: user1User2chatId,
      sender: user1.id,
      text: "Hello World",
    };
    const user2Message = {
      chat: user1User2chatId,
      sender: user2.id,
      text: "Hello World 2",
    };

    await Message.create(user1Message);
    await Message.create(user2Message);

    const ack = await user1Socket.emitWithAck("chat:join", user1User2chatId);

    if (ack instanceof EVENT_ERROR) throw new Error(ack.message);

    const {
      data: { participant, messages },
    } = ack;

    expect(participant.username).toBe(user2Data.userName);

    expect(messages[0].text).toEqual(user1Message.text);
    expect(messages[0].sender.id).toEqual(user1Message.sender);

    expect(messages[1].text).toEqual(user2Message.text);
    expect(messages[1].sender.id).toEqual(user2Message.sender);
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
        expect(message.sender.id).toEqual(user1.id);
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
        expect(message.sender.id).toEqual(user2.id);
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
