import request from "supertest";
import { app } from "../../app";
import User from "../../models/User";
import { setupMongoDB, teardownMongoDB } from "../../__tests__/setup";
import jwt from "jsonwebtoken";

beforeAll(async () => {
  await setupMongoDB();
});

afterAll(async () => {
  await teardownMongoDB();
});

describe("/register", () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  it("should return 400 when username or password is missing", async () => {
    await request(app).post("/login").expect(400);
    await request(app).post("/login").send({ userName: "user" }).expect(400);
    await request(app).post("/login").send({ password: "password" }).expect(400);
  });

  it("should return 404 when username doesn't exist", async () => {
    const payload = { userName: "bob", password: "test" };
    const res = await request(app).post("/login").send(payload);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: `User with username "${payload.userName}" not found`,
    });
  });

  describe("With existing user", () => {
    const user = { userName: "john", password: "password123" };

    beforeEach(async () => {
      await request(app).post("/register").send(user);
    });

    it("should return 401 when password is incorrect", async () => {
      const res = await request(app)
        .post("/login")
        .send({ userName: user.userName, password: "wrong_password" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: "Invalid username or password",
      });
    });

    it("should login with correct password and return a token and refresh token cookie", async () => {
      const res = await request(app)
        .post("/login")
        .send({ userName: user.userName, password: user.password });

      expect(res.status).toBe(200);
      expect(res.body.message).toEqual("Login successful");

      // Check auth token
      expect(typeof res.body.token).toBe("string");
      expect(res.body.token).toBeTruthy;

      const decoded = jwt.decode(res.body.token);
      expect(decoded).toHaveProperty("UserInfo.userId");
      expect(decoded).toHaveProperty("exp");

      // Check cookie
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies).toEqual(
        expect.arrayContaining([expect.stringContaining("jwt=")])
      );
    });
  });
});
