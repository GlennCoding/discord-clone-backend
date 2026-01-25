import request from "supertest";

import { app } from "../../app";
import User from "../../models/User";

describe("/logout", () => {
  beforeEach(async () => {
    await User.deleteMany({});
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
    const refreshCookie = cookies.find((cookie) =>
      cookie.startsWith("refresh_token=")
    );

    expect(accessCookie).toBeDefined();
    expect(accessCookie).toContain("access_token=;");
    expect(accessCookie).toContain("Path=/");

    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain("refresh_token=;");
    expect(refreshCookie).toContain("Path=/refresh");
  });

  it("removes the refresh token from the user when provided", async () => {
    const refreshToken = "refresh_token_value";
    await User.create({
      userName: "logout-user",
      password: "hashed-password",
      refreshTokens: [refreshToken],
    });

    await request(app)
      .post("/logout")
      .set("Cookie", [`refresh_token=${refreshToken}`])
      .expect(204);

    const updatedUser = await User.findOne({ userName: "logout-user" }).lean();

    expect(updatedUser?.refreshTokens).toEqual([]);
  });
});
