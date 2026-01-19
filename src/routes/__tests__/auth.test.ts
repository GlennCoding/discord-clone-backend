import request from "supertest";
import { app } from "../../app";
import User from "../../models/User";
import jwt from "jsonwebtoken";

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

    it("should login with correct password and set access/refresh token cookies", async () => {
      const res = await request(app)
        .post("/login")
        .send({ userName: user.userName, password: user.password });

      expect(res.status).toBe(200);
      expect(res.body.message).toEqual("Login successful");

      // Check response payload
      expect(res.body.userData.username).toEqual(user.userName);

      // Check cookies
      const rawSetCookieHeader = res.headers["set-cookie"];
      const cookies = Array.isArray(rawSetCookieHeader)
        ? rawSetCookieHeader
        : rawSetCookieHeader
          ? [rawSetCookieHeader]
          : undefined;
      expect(cookies).toBeDefined();
      expect(cookies).toEqual(
        expect.arrayContaining([
          expect.stringContaining("access_token="),
          expect.stringContaining("refresh_token="),
        ]),
      );

      const accessTokenCookie = cookies?.find((cookie) =>
        cookie.startsWith("access_token="),
      );
      expect(accessTokenCookie).toBeDefined();

      const accessToken = accessTokenCookie?.split(";")[0].split("=")[1];
      expect(accessToken).toBeDefined();

      const decoded = jwt.decode(decodeURIComponent(accessToken as string));
      expect(decoded).toHaveProperty("UserInfo.userId");
      expect(decoded).toHaveProperty("exp");
    });
  });
});
