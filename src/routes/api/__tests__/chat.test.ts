import { app } from "../../../app";
import request from "supertest";
import Chat from "../../../models/Chat";
import User, { IUser } from "../../../models/User";
import { ChatDTO } from "../../../types/dto";
import { buildAccessTokenCookie } from "../../../__tests__/helpers/cookies";
import { issueAccessToken } from "../../../services/authService";

let token: string;
const user1Data = { userName: "John", password: "Cena" };
const user2Data = {
  userName: "Nama",
  password: "Rupa",
  avatar: { filePath: "path", url: "url.com" },
};
let user1: IUser;
let user2: IUser;

beforeAll(async () => {
  user1 = await User.create(user1Data);
  await user1.save();
  token = issueAccessToken(user1);

  // Create user 2
  user2 = await User.create(user2Data);
  await user2.save();
});

beforeEach(async () => {
  // await User.deleteMany({});
  await Chat.deleteMany({});
});

describe("/chat", () => {
  it("can create a chat", async () => {
    // Create chat room
    const createChatRes = await request(app)
      .post("/chat")
      .send({ participant: user2Data.userName })
      .set("Cookie", [buildAccessTokenCookie(token)]);
    expect(createChatRes.status).toBe(201);

    const chatInDB = await Chat.findOne({ participants: user1 });

    expect(createChatRes.body.chatId).toBeTruthy;
    expect(chatInDB).not.toBeNull();
  });

  it("doesn't create the same chat twice", async () => {
    // Create chat room
    await request(app)
      .post("/chat")
      .send({ participant: user2Data.userName })
      .set("Cookie", [buildAccessTokenCookie(token)])
      .expect(201);

    await request(app)
      .post("/chat")
      .send({ participant: user2Data.userName })
      .set("Cookie", [buildAccessTokenCookie(token)])
      .expect(200);

    const chats = await Chat.find({});
    expect(chats.length).toBe(1);
  });

  it("can get chats", async () => {
    const user1Id = await User.findOne({ userName: user1Data.userName });
    const user2Id = await User.findOne({ userName: user2Data.userName });

    const chat = await Chat.create({
      participants: [user1Id?._id, user2Id?._id],
    });

    // Create chat room
    const getChatsRes = await request(app)
      .get("/chat")
      .set("Cookie", [buildAccessTokenCookie(token)]);

    expect(getChatsRes.status).toBe(200);
    expect(getChatsRes.body).toEqual([
      {
        chatId: chat.id!,
        participant: user2.userName,
        participantAvatarUrl: user2.avatar!.url,
      },
    ] as ChatDTO[]);
  });

  it("can delete a chat", async () => {
    const user1Id = await User.findOne({ userName: user1Data.userName });
    const user2Id = await User.findOne({ userName: user2Data.userName });

    const chat = await Chat.create({
      participants: [user1Id?._id, user2Id?._id],
    });

    // Create chat room
    const deleteChatres = await request(app)
      .delete(`/chat/${chat.id}`)
      .set("Cookie", [buildAccessTokenCookie(token)]);

    expect(deleteChatres.status).toBe(204);
  });

  it("throws 400 when a participant doesn't exist", async () => {
    const nonExistentUser = "nonExistentUser";
    const res = await request(app)
      .post("/chat")
      .send({ participant: nonExistentUser })
      .set("Cookie", [buildAccessTokenCookie(token)]);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: `User with username "${nonExistentUser}" not found`,
    });
  });

  it("throws 400 when trying to create a chat with oneself", async () => {
    const res = await request(app)
      .post("/chat")
      .send({ participant: user1Data.userName })
      .set("Cookie", [buildAccessTokenCookie(token)]);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "You can't start a chat with yourself",
    });
  });
});
