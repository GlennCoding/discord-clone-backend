import { setupMongoDB, teardownMongoDB } from "../../../__tests__/setup";
import { app } from "../../../app";
import request from "supertest";
import Chat from "../../../models/Chat";
import User, { IUser } from "../../../models/User";
import { IChatAPI } from "../../../types/sockets";

let token: string;
const user1Data = { userName: "John", password: "Cena" };
const user2Data = { userName: "Nama", password: "Rupa" };

beforeAll(async () => {
  await setupMongoDB();

  // Create user 1
  await request(app).post("/register").send(user1Data);
  const loginRes = await request(app).post("/login").send(user1Data);
  token = loginRes.body.token;

  // Create user 2
  await request(app).post("/register").send(user2Data);
});

afterAll(async () => {
  await teardownMongoDB();
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
      .set("Authorization", `Bearer ${token}`);
    expect(createChatRes.status).toBe(201);

    const user1Id = await User.findOne({ userName: user1Data.userName });
    const chatInDB = await Chat.findOne({ participants: user1Id });

    expect(createChatRes.body.chatId).toBeTruthy;
    expect(chatInDB).not.toBeNull();
  });

  it("doesn't create the same chat twice", async () => {
    // Create chat room
    await request(app)
      .post("/chat")
      .send({ participant: user2Data.userName })
      .set("Authorization", `Bearer ${token}`)
      .expect(201);

    await request(app)
      .post("/chat")
      .send({ participant: user2Data.userName })
      .set("Authorization", `Bearer ${token}`)
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
      .set("Authorization", `Bearer ${token}`);

    expect(getChatsRes.status).toBe(200);
    console.log(getChatsRes.body);
    expect(getChatsRes.body).toEqual([
      {
        chatId: chat.id!,
        participant: user2Data.userName,
      },
    ] as IChatAPI[]);
  });

  it("throws 400 when a participant doesn't exist", async () => {
    const nonExistentUser = "nonExistentUser";
    const res = await request(app)
      .post("/chat")
      .send({ participant: nonExistentUser })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: `A user with the username ${nonExistentUser} doesn't exist`,
    });
  });

  it("throws 400 when trying to create a chat with oneself", async () => {
    const res = await request(app)
      .post("/chat")
      .send({ participant: user1Data.userName })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "You can't start a chat with yourself",
    });
  });
});
