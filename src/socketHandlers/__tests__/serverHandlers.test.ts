import request from "supertest";
import { app } from "../../app";
import User, { IUser } from "../../models/User";
import ServerModel, { IServer } from "../../models/Server";
import Member from "../../models/Member";
import Channel from "../../models/Channel";
import { issueAccessToken } from "../../services/authService";
import { buildAccessTokenCookie } from "../../__tests__/helpers/cookies";
import { generateUniqueShortId } from "../../services/serverService";
import { ERROR_STATUS, EVENT_ERROR } from "../../types/sockets";
import { TypedClientSocket } from "../../types/sockets";
import {
  acquireSocketServer,
  releaseSocketServer,
  connectSocketWithToken,
  waitForEvent,
} from "./helpers/socketTestUtils";

const randomServerName = () => `Server-${Math.random().toString(36).slice(-5)}`;

const createOwnerAndServer = async () => {
  const owner = await User.create({ userName: randomServerName(), password: "pwd" });
  const ownerToken = issueAccessToken(owner);
  const shortId = await generateUniqueShortId();
  const server = await ServerModel.create({
    name: randomServerName(),
    shortId,
    owner,
    isPublic: true,
  });
  await Member.create({ user: owner, server });

  return { owner, ownerToken, server };
};

describe("server & channel socket handlers", () => {
  let clientSocket: TypedClientSocket | null = null;

  beforeAll(async () => {
    await acquireSocketServer();
  });

  afterAll(async () => {
    await releaseSocketServer();
  });

  afterEach(async () => {
    if (clientSocket) {
      clientSocket.removeAllListeners();
      clientSocket.disconnect();
      clientSocket = null;
    }
    await Promise.all([
      Channel.deleteMany({}),
      Member.deleteMany({}),
      ServerModel.deleteMany({}),
      User.deleteMany({}),
    ]);
  });

  it("subscribes to a server and returns its channels", async () => {
    const { ownerToken, server } = await createOwnerAndServer();
    await Channel.create({ server, name: "General", order: 1 });
    await Channel.create({ server, name: "Hidden", order: 2 });

    clientSocket = await connectSocketWithToken(ownerToken);

    const ack = await clientSocket.emitWithAck("server:subscribe", server.id);

    if (ack instanceof EVENT_ERROR) throw new Error(ack.message);

    expect(ack.status).toBe("OK");
    expect(ack.data.id).toBe(server.id);
    expect(ack.data.channels).toEqual([
      expect.objectContaining({ name: "General", order: 1 }),
      expect.objectContaining({ name: "Hidden", order: 2 }),
    ]);
  });

  it("rejects server subscriptions for non members", async () => {
    const { server } = await createOwnerAndServer();
    const outsider = await User.create({ userName: "outsider", password: "pwd" });
    const outsiderToken = issueAccessToken(outsider);

    clientSocket = await connectSocketWithToken(outsiderToken);

    const ack = await clientSocket.emitWithAck("server:subscribe", server.id);

    expect(ack).toEqual(
      expect.objectContaining({
        error: ERROR_STATUS.UNAUTHORIZED,
        message: "You are no member of this server",
      })
    );
  });

  it("pushes channel lifecycle events to subscribed clients", async () => {
    const { ownerToken, server } = await createOwnerAndServer();
    clientSocket = await connectSocketWithToken(ownerToken);

    const ack = await clientSocket.emitWithAck("server:subscribe", server.id);
    if (ack instanceof EVENT_ERROR) throw new Error(ack.message);

    const createdPromise = waitForEvent<{ id: string; name: string; order: number }>(
      clientSocket,
      "channel:created"
    );

    const createRes = await request(app)
      .post(`/channel/${server.id}`)
      .set("Cookie", [buildAccessTokenCookie(ownerToken)])
      .send({ name: "Announcements" });

    expect(createRes.status).toBe(201);
    const createdEvent = await createdPromise;
    expect(createdEvent.name).toBe("Announcements");

    const updatedPromise = waitForEvent<{ id: string; name: string }>(
      clientSocket,
      "channel:updated"
    );

    const updateRes = await request(app)
      .put(`/channel/${server.id}/${createRes.body.id}`)
      .set("Cookie", [buildAccessTokenCookie(ownerToken)])
      .send({ name: "Updates" });
    expect(updateRes.status).toBe(200);
    const updatedEvent = await updatedPromise;
    expect(updatedEvent).toEqual(
      expect.objectContaining({ id: createRes.body.id, name: "Updates" })
    );

    const deletedPromise = waitForEvent<string>(clientSocket, "channel:deleted");
    const deleteRes = await request(app)
      .delete(`/channel/${server.id}/${createRes.body.id}`)
      .set("Cookie", [buildAccessTokenCookie(ownerToken)]);
    expect(deleteRes.status).toBe(204);
    const deletedEvent = await deletedPromise;
    expect(deletedEvent).toBe(createRes.body.id);
  });

  it("emits server updated and deleted events", async () => {
    const { ownerToken, server } = await createOwnerAndServer();
    clientSocket = await connectSocketWithToken(ownerToken);
    const ack = await clientSocket.emitWithAck("server:subscribe", server.id);
    if (ack instanceof EVENT_ERROR) throw new Error(ack.message);

    const updatedPromise = waitForEvent<{ id: string; name: string }>(
      clientSocket,
      "server:updated"
    );

    const updatePayload = {
      name: "Renamed Server",
      description: "New Desc",
      isPublic: false,
    };

    const updateRes = await request(app)
      .put(`/server/${server.id}`)
      .set("Cookie", [buildAccessTokenCookie(ownerToken)])
      .send(updatePayload);
    expect(updateRes.status).toBe(200);
    const serverUpdated = await updatedPromise;
    expect(serverUpdated).toEqual(
      expect.objectContaining({ id: server.id, name: updatePayload.name })
    );

    const deletedPromise = waitForEvent<string>(clientSocket, "server:deleted");
    const deleteRes = await request(app)
      .delete(`/server/${server.id}`)
      .set("Cookie", [buildAccessTokenCookie(ownerToken)]);
    expect(deleteRes.status).toBe(204);
    const deletedId = await deletedPromise;
    expect(deletedId).toBe(server.id);
  });
});
