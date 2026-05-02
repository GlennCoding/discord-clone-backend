import request from "supertest";

import { buildAccessTokenCookie } from "../../../__tests__/helpers/cookies";
import { app } from "../../../app";
import Channel from "../../../models/Channel";
import ChannelMessage from "../../../models/ChannelMessage";
import Member from "../../../models/Member";
import Role from "../../../models/Role";
import Server from "../../../models/Server";
import User from "../../../models/User";
import { issueAccessToken } from "../../../services/authService";

import type { IUser } from "../../../models/User";

let ownerToken: string;
let user1: IUser;
let user2: IUser;

const user1Data = { userName: "server-tx-user1", password: "pwd" };
const user2Data = { userName: "server-tx-user2", password: "pwd" };

beforeAll(async () => {
  user1 = await User.create(user1Data);
  user2 = await User.create(user2Data);
  ownerToken = issueAccessToken(user1);
});

afterAll(async () => {
  await User.deleteMany({});
});

afterEach(async () => {
  await Channel.deleteMany({});
  await ChannelMessage.deleteMany({});
  await Role.deleteMany({});
  await Member.deleteMany({});
  await Server.deleteMany({});
});

describe("/server transactions", () => {
  it("deletes a server and all related data atomically", async () => {
    const server = await Server.create({
      name: "Doomed Server",
      shortId: "DOOM01",
      owner: user1,
      isPublic: true,
    });
    await Member.create({ user: user1, server });
    await Role.create({ server, name: "Role 1" });
    const channel = await Channel.create({ server, name: "general", order: 1 });
    const sender = await Member.findOne({ server, user: user1 });
    await ChannelMessage.create({ channel, sender: sender!, text: "hello world" });

    const { status } = await request(app)
      .delete(`/server/${server.id}`)
      .set("Cookie", [buildAccessTokenCookie(ownerToken)]);

    expect(status).toBe(204);

    expect(await Server.findById(server.id)).toBeNull();
    expect(await Member.find({ server: server.id })).toHaveLength(0);
    expect(await Role.find({ server: server.id })).toHaveLength(0);
    expect(await Channel.find({ server: server.id })).toHaveLength(0);
    expect(await ChannelMessage.find({ channel: channel.id })).toHaveLength(0);
  });
});
