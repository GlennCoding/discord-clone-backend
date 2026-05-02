import request from "supertest";

import { buildAccessTokenCookie } from "../../../__tests__/helpers/cookies";
import { app } from "../../../app";
import Channel from "../../../models/Channel";
import ChannelMessage from "../../../models/ChannelMessage";
import Member from "../../../models/Member";
import Server from "../../../models/Server";
import User from "../../../models/User";
import { issueAccessToken } from "../../../services/authService";

import type { IServer } from "../../../models/Server";
import type { IUser } from "../../../models/User";

let owner: IUser;
let ownerToken: string;
let server: IServer;

const ownerData = { userName: "channel-tx-owner", password: "pwd" };

beforeAll(async () => {
  owner = await User.create(ownerData);
  ownerToken = issueAccessToken(owner);
});

beforeEach(async () => {
  server = await Server.create({
    name: "Channel Tx Server",
    shortId: `chtx-${Math.random().toString(36).slice(-4)}`,
    owner,
    isPublic: true,
  });
  await Member.create({ user: owner, server });
});

afterEach(async () => {
  await Channel.deleteMany({});
  await ChannelMessage.deleteMany({});
  await Member.deleteMany({});
  await Server.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
});

describe("/channel transactions", () => {
  it("deletes a channel and its messages atomically", async () => {
    const channel = await Channel.create({ server, name: "General", order: 1 });
    const sender = await Member.findOne({ server, user: owner });
    await ChannelMessage.create({ channel, sender: sender!, text: "hello" });
    await ChannelMessage.create({ channel, sender: sender!, text: "world" });

    const res = await request(app)
      .delete(`/channel/${server.id}/${channel.id}`)
      .set("Cookie", [buildAccessTokenCookie(ownerToken)]);

    expect(res.status).toBe(204);

    expect(await Channel.findById(channel.id)).toBeNull();
    expect(await ChannelMessage.find({ channel: channel.id })).toHaveLength(0);
  });
});
