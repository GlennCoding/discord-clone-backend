import request from "supertest";
import User from "../../../models/User";
import { setupMongoDB, teardownMongoDB } from "../../../__tests__/setup";
import { app } from "../../../app";
import { bucket } from "../../../config/storage";

const user1Data = { userName: "John", password: "Cena" };

beforeAll(async () => {
  await setupMongoDB();
});

afterAll(async () => {
  await teardownMongoDB();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe("/profile", () => {
  it("can get user profile data", async () => {
    await request(app).post("/register").send(user1Data);
    const loginRes = await request(app).post("/login").send(user1Data);
    const token = loginRes.body.token;

    const user = await User.findOne({ userName: user1Data.userName });

    if (!user) throw Error("User not found");
    user.status = "I am a new status";

    const res = await request(app)
      .get("/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.userName).toBe(user1Data.userName);
  });

  it("can update user status", async () => {
    await request(app).post("/register").send(user1Data);
    const loginRes = await request(app).post("/login").send(user1Data);
    const token = loginRes.body.token;

    const newStatus = "I am a new status";

    const res = await request(app)
      .put("/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ status: newStatus });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(newStatus);
  });

  it("can set a user status to undefined", async () => {
    await request(app).post("/register").send(user1Data);
    const loginRes = await request(app).post("/login").send(user1Data);
    const token = loginRes.body.token;

    const user = await User.findOne({ userName: user1Data.userName });

    if (!user) throw Error("User not found");
    user.status = "I am a new status";

    const newStatus = "";

    const res = await request(app)
      .put("/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ status: newStatus });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(undefined);
  });

  it("should throw an error when user status is too long", async () => {
    await request(app).post("/register").send(user1Data);
    const loginRes = await request(app).post("/login").send(user1Data);
    const token = loginRes.body.token;

    const longStatus = "a".repeat(201);

    const res = await request(app)
      .put("/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ status: longStatus });

    expect(res.status).toBe(400);
  });

  // TODO: Implement bucket mock
  it("can upload a user profile image", async () => {
    await request(app).post("/register").send(user1Data);
    const loginRes = await request(app).post("/login").send(user1Data);
    const token = loginRes.body.token;

    const res = await request(app)
      .put("/profile")
      .set("Authorization", `Bearer ${token}`)
      .attach("profilePicture", "__tests__/test-image.png");

    console.log(res.body);

    expect(res.status).toBe(200);
    expect(res.body.profileImgUrl).toBeDefined();
  });

  // TODO: Implement bucket mock & asyncHandler
  // it("should throw an error when image size is too large", async () => {
  //   await request(app).post("/register").send(user1Data);
  //   const loginRes = await request(app).post("/login").send(user1Data);
  //   const token = loginRes.body.token;

  //   const res = await request(app)
  //     .put("/profile")
  //     .set("Authorization", `Bearer ${token}`)
  //     .attach("profilePicture", "__tests__/large-test-image.png");

  //   expect(res.status).toBe(400);
  // });

  // TODO: Implement bucket mock
  // it("can delete a user profile image", async () => {
  //   await request(app).post("/register").send(user1Data);
  //   const loginRes = await request(app).post("/login").send(user1Data);
  //   const token = loginRes.body.token;

  //   await request(app)
  //     .put("/profile")
  //     .set("Authorization", `Bearer ${token}`)
  //     .attach("profilePicture", "__tests__/test-image.png");

  //   const res = await request(app)
  //     .delete("/profile/picture")
  //     .set("Authorization", `Bearer ${token}`);

  //   expect(res.status).toBe(204);

  //   const user = await User.findOne({ userName: user1Data.userName });
  //   expect(user?.avatar).toBeUndefined();
  // });
});
