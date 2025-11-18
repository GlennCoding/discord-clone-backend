import User from "../../models/User";
import ServerModel, { IServer } from "../../models/Server";
import Channel from "../../models/Channel";
import ChannelMessage from "../../models/ChannelMessage";
import Member from "../../models/Member";
import { issueAuthToken } from "../../services/authService";
import { generateUniqueShortId } from "../../services/serverService";
import { ERROR_STATUS, EVENT_ERROR } from "../../types/events";
import { TypedClientSocket } from "../../types/sockets";
import { ChannelMessageDTO } from "../../types/dto";
import {
  acquireSocketServer,
  releaseSocketServer,
  connectSocketWithToken,
  waitForEvent,
} from "./helpers/socketTestUtils";

const randomName = () => `user-${Math.random().toString(36).slice(-5)}`;

const createUserAndToken = async (userName = randomName()) => {
  const user = await User.create({ userName, password: "password" });
  const token = issueAuthToken(user);
  return { user, token };
};

const createServerWithChannel = async () => {
  const { user, token } = await createUserAndToken();
  const server = await ServerModel.create({
    name: `Server-${Math.random().toString(36).slice(-5)}`,
    shortId: await generateUniqueShortId(),
    owner: user,
    isPublic: true,
  });
  const member = await Member.create({ user, server });
  const channel = await Channel.create({ server, name: "General", order: 1 });

  return { owner: user, ownerToken: token, server, channel, member };
};

const addMemberToServer = async (server: IServer, userName = randomName()) => {
  const { user, token } = await createUserAndToken(userName);
  const member = await Member.create({ user, server });
  return { user, token, member };
};

describe("channel message socket handlers", () => {
  const sockets: TypedClientSocket[] = [];

  const trackSocket = (socket: TypedClientSocket) => {
    sockets.push(socket);
    return socket;
  };

  const connectTrackedSocket = async (token: string) => {
    const socket = await connectSocketWithToken(token);
    return trackSocket(socket);
  };

  beforeAll(async () => {
    await acquireSocketServer();
  });

  afterAll(async () => {
    await releaseSocketServer();
  });

  afterEach(async () => {
    sockets.splice(0).forEach((socket) => {
      socket.removeAllListeners();
      socket.disconnect();
    });
    await Promise.all([
      ChannelMessage.deleteMany({}),
      Channel.deleteMany({}),
      Member.deleteMany({}),
      ServerModel.deleteMany({}),
      User.deleteMany({}),
    ]);
  });

  it("subscribes to a channel and returns recent messages", async () => {
    const { ownerToken, channel, member, server } = await createServerWithChannel();
    await ChannelMessage.create({ channel, sender: member._id, text: "Existing" });

    const socket = await connectTrackedSocket(ownerToken);
    const ack = await socket.emitWithAck("channelMessages:subscribe", channel.id);

    if (ack instanceof EVENT_ERROR) throw new Error(ack.message);

    expect(ack.status).toBe("OK");
    expect(ack.data.channel).toEqual(
      expect.objectContaining({ id: channel.id, name: "General", order: 1 })
    );
    expect(ack.data.serverId).toBe(server.id);
    expect(ack.data.messages).toHaveLength(1);
    expect(ack.data.messages[0].text).toBe("Existing");
  });

  it("rejects channel subscriptions for non members", async () => {
    const { channel } = await createServerWithChannel();
    const outsider = await createUserAndToken("outsider");
    const socket = await connectTrackedSocket(outsider.token);

    const ack = await socket.emitWithAck("channelMessages:subscribe", channel.id);

    expect(ack).toEqual(
      expect.objectContaining({
        error: ERROR_STATUS.UNAUTHORIZED,
        message: "You are no member of this server",
      })
    );
  });

  it("broadcasts new messages to subscribed members", async () => {
    const { ownerToken, channel, server } = await createServerWithChannel();
    const { token: memberToken } = await addMemberToServer(server);

    const ownerSocket = await connectTrackedSocket(ownerToken);
    const memberSocket = await connectTrackedSocket(memberToken);

    const ownerAck = await ownerSocket.emitWithAck(
      "channelMessages:subscribe",
      channel.id
    );
    if (ownerAck instanceof EVENT_ERROR) throw new Error(ownerAck.message);

    const memberAck = await memberSocket.emitWithAck(
      "channelMessages:subscribe",
      channel.id
    );
    if (memberAck instanceof EVENT_ERROR) throw new Error(memberAck.message);

    const messagePromise = waitForEvent<ChannelMessageDTO>(
      memberSocket,
      "channelMessage:new"
    );

    const sendAck = await ownerSocket.emitWithAck("channelMessage:new", {
      channelId: channel.id,
      text: "Hello from owner",
    });

    if (sendAck instanceof EVENT_ERROR) throw new Error(sendAck.message);
    expect(sendAck.status).toBe("OK");
    expect(sendAck.data.message.text).toBe("Hello from owner");

    const received = await messagePromise;
    expect(received.channelId).toBe(channel.id);
    expect(received.text).toBe("Hello from owner");
  });

  it("stops delivering events after unsubscribe", async () => {
    const { ownerToken, channel, server } = await createServerWithChannel();
    const { token: memberToken } = await addMemberToServer(server);

    const ownerSocket = await connectTrackedSocket(ownerToken);
    const memberSocket = await connectTrackedSocket(memberToken);

    await ownerSocket.emitWithAck("channelMessages:subscribe", channel.id);
    await memberSocket.emitWithAck("channelMessages:subscribe", channel.id);

    const unsubscribeAck = await memberSocket.emitWithAck(
      "channelMessages:unsubscribe",
      channel.id
    );
    if (unsubscribeAck instanceof EVENT_ERROR) throw new Error(unsubscribeAck.message);

    const silentPromise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 200);
      memberSocket.once("channelMessage:new", () => {
        clearTimeout(timer);
        reject(new Error("Received event after unsubscribe"));
      });
    });

    await ownerSocket.emitWithAck("channelMessage:new", {
      channelId: channel.id,
      text: "Message after unsubscribe",
    });

    await silentPromise;
  });
});
