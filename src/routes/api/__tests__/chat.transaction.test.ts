import request from "supertest";

import { buildAccessTokenCookie } from "../../../__tests__/helpers/cookies";
import { app } from "../../../app";
import Chat from "../../../models/Chat";
import ChatMessage from "../../../models/ChatMessage";
import User from "../../../models/User";
import { issueAccessToken } from "../../../services/authService";

import type { IUser } from "../../../models/User";

let token: string;
const user1Data = { userName: "John", password: "Cena" };
const user2Data = { userName: "Nama", password: "Rupa" };
let user1: IUser;
let user2: IUser;

beforeAll(async () => {
  user1 = await User.create(user1Data);
  token = issueAccessToken(user1);
  user2 = await User.create(user2Data);
});

beforeEach(async () => {
  await Chat.deleteMany({});
  await ChatMessage.deleteMany({});
});

describe("/chat transactions", () => {
  it("deletes chat and its messages atomically", async () => {
    const chat = await Chat.create({
      participants: [user1._id, user2._id],
    });

    await ChatMessage.create([
      { chat: chat._id, sender: user1._id, content: "hello" },
      { chat: chat._id, sender: user2._id, content: "world" },
    ]);

    const res = await request(app)
      .delete(`/chat/${chat.id}`)
      .set("Cookie", [buildAccessTokenCookie(token)]);

    expect(res.status).toBe(204);
    expect(await Chat.findById(chat._id)).toBeNull();
    expect(await ChatMessage.find({ chat: chat._id })).toHaveLength(0);
  });
});
