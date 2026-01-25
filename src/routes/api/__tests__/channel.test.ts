import { Types } from "mongoose";
import request from "supertest";

import {
  expectBadRequest,
  expectForbidden,
  expectNotFound,
  expectUnauthorized,
} from "../../../__tests__/helpers/assertions";
import { buildAccessTokenCookie } from "../../../__tests__/helpers/cookies";
import { app } from "../../../app";
import Channel from "../../../models/Channel";
import Member from "../../../models/Member";
import Server from "../../../models/Server";
import User from "../../../models/User";
import { issueAccessToken } from "../../../services/authService";

import type { IServer } from "../../../models/Server";
import type { IUser } from "../../../models/User";

let owner: IUser;
let moderator: IUser;
let outsider: IUser;
let ownerToken: string;
let moderatorToken: string;
let outsiderToken: string;
let server: IServer;

const ownerData = { userName: "channel-owner", password: "pwd" };
const moderatorData = { userName: "channel-moderator", password: "pwd" };
const outsiderData = { userName: "channel-outsider", password: "pwd" };

const createServer = async () => {
  const shortId = `chan-${Math.random().toString(36).slice(-6)}`;
  return await Server.create({
    name: "Channel playground",
    shortId,
    owner,
    isPublic: true,
  });
};

const makeChannel = async (
  overrides: Partial<{ name: string; order: number }> = {}
) =>
  await Channel.create({
    server,
    name: "General",
    order: 1,
    ...overrides,
  });

beforeAll(async () => {
  owner = await User.create(ownerData);
  moderator = await User.create(moderatorData);
  outsider = await User.create(outsiderData);

  ownerToken = issueAccessToken(owner);
  moderatorToken = issueAccessToken(moderator);
  outsiderToken = issueAccessToken(outsider);
});

beforeEach(async () => {
  server = await createServer();
  await Member.create({ user: owner, server });
});

afterEach(async () => {
  await Channel.deleteMany({});
  await Member.deleteMany({});
  await Server.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
});

describe("/channel", () => {
  it("creates a channel with the next order inside a server the user owns", async () => {
    await Channel.create({ server, name: "General", order: 1 });
    await Channel.create({ server, name: "Random", order: 2 });

    const payload = { name: "Announcements" };
    const res = await request(app)
      .post(`/channel/${server.id}`)
      .set("Cookie", [buildAccessTokenCookie(ownerToken)])
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      name: payload.name,
      order: 3,
    });

    const created = await Channel.findById(res.body.id);
    expect(created).toBeTruthy();
    expect(created?.name).toBe(payload.name);
    expect(created?.order).toBe(3);
    expect(created?.server.toString()).toBe(server.id);
  });

  it("updates an existing channel name", async () => {
    const channel = await makeChannel();
    const updatedName = "Project Updates";

    const res = await request(app)
      .put(`/channel/${server.id}/${channel.id}`)
      .set("Cookie", [buildAccessTokenCookie(ownerToken)])
      .send({ name: updatedName });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: channel.id,
      name: updatedName,
      order: channel.order,
    });

    const updated = await Channel.findById(channel.id);
    expect(updated?.name).toBe(updatedName);
  });

  it("deletes a channel owned by the server", async () => {
    const channel = await makeChannel();

    const res = await request(app)
      .delete(`/channel/${server.id}/${channel.id}`)
      .set("Cookie", [buildAccessTokenCookie(ownerToken)]);

    expect(res.status).toBe(204);

    const deleted = await Channel.findById(channel.id);
    expect(deleted).toBeNull();
  });
});

describe("/channel errors", () => {
  it("requires authentication to create a channel", async () => {
    const res = await request(app)
      .post(`/channel/${server.id}`)
      .send({ name: "Guests" });

    expectUnauthorized(res);
  });

  it("rejects channel creation without a valid name", async () => {
    const res = await request(app)
      .post(`/channel/${server.id}`)
      .set("Cookie", [buildAccessTokenCookie(ownerToken)])
      .send({ name: "   " });

    expectBadRequest(res);
  });

  it("rejects channel updates without a valid name", async () => {
    const channel = await makeChannel();

    const res = await request(app)
      .put(`/channel/${server.id}/${channel.id}`)
      .set("Cookie", [buildAccessTokenCookie(ownerToken)])
      .send({ name: "" });

    expectBadRequest(res);
  });

  it("returns 404 when creating a channel for a missing server", async () => {
    const missingServerId = new Types.ObjectId().toString();
    const res = await request(app)
      .post(`/channel/${missingServerId}`)
      .set("Cookie", [buildAccessTokenCookie(ownerToken)])
      .send({ name: "Hidden" });

    expectNotFound(res);
  });

  it("returns 404 when updating a missing channel", async () => {
    const missingChannelId = new Types.ObjectId().toString();
    const res = await request(app)
      .put(`/channel/${server.id}/${missingChannelId}`)
      .set("Cookie", [buildAccessTokenCookie(ownerToken)])
      .send({ name: "Whatever" });

    expectNotFound(res);
  });

  it("returns 404 when deleting a missing channel", async () => {
    const missingChannelId = new Types.ObjectId().toString();
    const res = await request(app)
      .delete(`/channel/${server.id}/${missingChannelId}`)
      .set("Cookie", [buildAccessTokenCookie(ownerToken)]);

    expectNotFound(res);
  });

  it("prevents members without ownership from creating channels", async () => {
    await Member.create({ user: moderator, server });

    const res = await request(app)
      .post(`/channel/${server.id}`)
      .set("Cookie", [buildAccessTokenCookie(moderatorToken)])
      .send({ name: "Mod experiments" });

    expectForbidden(res);
  });

  it("prevents non-members from managing channels", async () => {
    const res = await request(app)
      .post(`/channel/${server.id}`)
      .set("Cookie", [buildAccessTokenCookie(outsiderToken)])
      .send({ name: "Intrusion" });

    expectForbidden(res);
  });

  it("prevents non-owners from deleting channels", async () => {
    const channel = await makeChannel();
    await Member.create({ user: moderator, server });

    const res = await request(app)
      .delete(`/channel/${server.id}/${channel.id}`)
      .set("Cookie", [buildAccessTokenCookie(moderatorToken)]);

    expectForbidden(res);
  });
});
