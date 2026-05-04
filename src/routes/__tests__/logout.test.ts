import request from "supertest";

import { app } from "../../app";
import RefreshToken from "../../models/RefreshToken";
import User from "../../models/User";

describe("/logout", () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await RefreshToken.deleteMany({});
  });

  it("clears auth cookies even when no refresh token cookie is present", async () => {
    const res = await request(app).post("/logout").expect(204);

    const rawSetCookieHeader = res.headers["set-cookie"];
    const cookies = Array.isArray(rawSetCookieHeader)
      ? rawSetCookieHeader
      : rawSetCookieHeader
        ? [rawSetCookieHeader]
        : [];

    expect(cookies.length).toBeGreaterThanOrEqual(2);
    const accessCookie = cookies.find((cookie) => cookie.startsWith("access_token="));
    const refreshCookie = cookies.find((cookie) => cookie.startsWith("refresh_token="));

    expect(accessCookie).toBeDefined();
    expect(accessCookie).toContain("access_token=;");
    expect(accessCookie).toContain("Path=/");

    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain("refresh_token=;");
    expect(refreshCookie).toContain("Path=/refresh");
  });

  it("removes the refresh token from the database when provided", async () => {
    // Register (also stores a token), then clear tokens, then login to get exactly one
    const agent = request.agent(app);
    await agent.post("/register").send({ userName: "logout-user", password: "password123" });
    await RefreshToken.deleteMany({});

    const loginRes = await agent
      .post("/login")
      .send({ userName: "logout-user", password: "password123" });

    const rawSetCookieHeader = loginRes.headers["set-cookie"];
    const cookies: string[] = Array.isArray(rawSetCookieHeader)
      ? rawSetCookieHeader
      : rawSetCookieHeader
        ? [rawSetCookieHeader]
        : [];
    const refreshCookie = cookies.find((c) => c.startsWith("refresh_token="));
    const refreshToken = refreshCookie?.split(";")[0].split("=")[1];

    const user = await User.findOne({ userName: "logout-user" }).lean();
    const tokensBefore = await RefreshToken.countDocuments({ userId: user?._id });
    expect(tokensBefore).toBe(1);

    await request(app)
      .post("/logout")
      .set("Cookie", [`refresh_token=${refreshToken}`])
      .expect(204);

    const tokensAfter = await RefreshToken.countDocuments({ userId: user?._id });
    expect(tokensAfter).toBe(0);
  });
});
