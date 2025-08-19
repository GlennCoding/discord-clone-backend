import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../../app";
import User from "../../models/User";

let mongoServer;

describe("/register", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer!.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it("should respond with string", async () => {
    const res = await request(app).get("/").expect(200);
    expect(res.body.message).toBe("Hello wonderful world!");
  });

  it("should successfully register a new user", async () => {
    const payload = { userName: "John", password: "Cena" };
    await request(app).post("/register").send(payload).expect(201);

    const userInDb = await User.findOne({ userName: payload.userName });

    expect(userInDb).not.toBeNull();
    expect(userInDb!.userName).toBe(payload.userName);
    expect(userInDb!.password).not.toBe(payload.password);
  });

  it("should throw an error for a duplicate username", async () => {
    await User.create({ userName: "Test", password: "password123" });

    const payload = { userName: "Test", password: "password123" };
    await request(app).post("/register").send(payload).expect(409);
  });

  it("should throw an error for a missing input", async () => {
    const payload = { userName: "John2" };
    const payload2 = { password: "John2" };
    const payload3 = {};

    await request(app).post("/register").send(payload).expect(400);
    await request(app).post("/register").send(payload2).expect(400);
    await request(app).post("/register").send(payload3).expect(400);
  });
});
