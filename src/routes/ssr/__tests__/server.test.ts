import request from "supertest";

import {
  expectForbidden,
  expectUnauthorized,
} from "../../../__tests__/helpers/assertions";
import { buildSsrAccessTokenCookie } from "../../../__tests__/helpers/cookies";
import { app } from "../../../app";
import Channel from "../../../models/Channel";
import ChannelMessage from "../../../models/ChannelMessage";
import Member from "../../../models/Member";
import Role from "../../../models/Role";
import Server, { IServer } from "../../../models/Server";
import User from "../../../models/User";
import { issueSsrAccessToken } from "../../../services/authService";

import type { IUser } from "../../../models/User";

let user1: IUser;
let user2: IUser;
let user1SsrToken: string;

beforeAll(async () => {
  user1 = await User.create({ userName: "user1", password: "pwd" });
  user2 = await User.create({ userName: "user2", password: "pwd" });
  user1SsrToken = issueSsrAccessToken(user1);
});

afterEach(async () => {
  await Channel.deleteMany({});
  await ChannelMessage.deleteMany({});
  await Role.deleteMany({});
  await Member.deleteMany({});
  await Server.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
});

describe("/ssr/server", () => {
  it("returns 401 when SSR token is missing", async () => {
    const server = await Server.create({
      name: "Server 1",
      shortId: "AAAAAA",
      owner: user1,
      isPublic: true,
    });
    await Member.create({ user: user1, server });

    const res = await request(app).get(`/ssr/server/${server.shortId}`);
    expectUnauthorized(res);
  });

  it("returns detailed server data when authenticated via SSR token", async () => {
    const server = await Server.create({
      name: "Server 1",
      shortId: "BBBBBB",
      owner: user1,
      isPublic: true,
      description: "desc",
    });
    await Member.create({ user: user1, server });

    const { status, body } = await request(app)
      .get(`/ssr/server/${server.shortId}`)
      .set("Cookie", [buildSsrAccessTokenCookie(user1SsrToken)]);

    expect(status).toBe(200);
    expect(body.id).toBe(server.id);
    expect(body.name).toBe(server.name);
    expect(body.description).toBe(server.description);
  });

  it("still enforces membership checks", async () => {
    const server = await Server.create({
      name: "Server 2",
      shortId: "CCCCCC",
      owner: user2,
      isPublic: true,
    });
    await Member.create({ user: user2, server });

    const res = await request(app)
      .get(`/ssr/server/${server.shortId}`)
      .set("Cookie", [buildSsrAccessTokenCookie(user1SsrToken)]);

    expectForbidden(res);
  });
});

