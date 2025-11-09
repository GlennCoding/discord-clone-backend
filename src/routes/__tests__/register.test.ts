import request from "supertest";
import { app } from "../../app";
import User from "../../models/User";

describe("/register", () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  it("should successfully register a new user and hash the password", async () => {
    const payload = { userName: "John", password: "Cena" };
    await request(app).post("/register").send(payload).expect(201);

    const userInDb = await User.findOne({ userName: payload.userName });

    expect(userInDb).not.toBeNull();
    expect(userInDb!.userName).toBe(payload.userName);
    expect(userInDb!.password).not.toBe(payload.password);
  }, 10000);

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
