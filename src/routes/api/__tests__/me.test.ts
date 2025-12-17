/**
 * Test cases:
 * 1. returns MeDTO on successul request
 * 2. returns 401 on unauthorized request
 */
import request from "supertest";
import User, { IUser } from "../../../models/User";
import { issueAccessToken } from "../../../services/authService";
import { app } from "../../../app";
import { MeDTO } from "../../../types/dto";
import { buildAccessTokenCookie } from "../../../__tests__/helpers/cookies";

/**
 * Before all -> Setup mongo, create user, get token
 *
 * Run tests with token
 *
 * After all -> Teardown Mongo
 */

let token: string;
let user: IUser;
const userData = {
  userName: "nama",
  password: "rupa",
  avatar: { url: "www.storage.com", filePath: "path" },
} as IUser;

beforeAll(async () => {
  user = await User.create(userData);
  await user.save();

  token = issueAccessToken(user);
});

describe("/me", () => {
  it("should return userData", async () => {
    const res = await request(app)
      .get("/me")
      .set("Cookie", [buildAccessTokenCookie(token)]);

    expect(res.body).toEqual({
      id: user.id,
      username: user.userName,
      avatarUrl: user.avatar?.url,
    } as MeDTO);
  });

  it("should throw 401 when token is missing", async () => {
    const res = await request(app).get("/me");

    expect(res.status).toBe(401);
  });
});
