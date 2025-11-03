import request from "supertest";
import { Types } from "mongoose";
import { setupMongoDB, teardownMongoDB } from "../../../__tests__/setup";
import User, { IUser } from "../../../models/User";
import { issueAuthToken } from "../../../services/authService";
import { app } from "../../../app";
import {
  CreateServerInput,
  ServerDTO,
  ServerListDTO,
  UpdateServerInput,
  JoinServerDTO,
} from "../../../types/dto";
import Server, { IServer } from "../../../models/Server";
import Member, { IMember } from "../../../models/Member";
import Role, { IRole } from "../../../models/Role";
import Channel from "../../../models/Channel";
import {
  expectBadRequest,
  expectNotFound,
  expectForbidden,
  expectUnauthorized,
} from "../../../__tests__/helpers/assertions";

let ownerToken: string;
let otherUserToken: string;
let user1: IUser;
let user2: IUser;
let server1: IServer;

const user1Data = { userName: "user1", password: "pwd" };
const user2Data = { userName: "user2", password: "pwd" };
const server1Data = {
  name: "Server 1",
  shortId: "111111",
  isPublic: true,
  description: "Server description",
};

const createServer = async ({
  owner,
  isPublic = true,
}: {
  owner: IUser;
  isPublic?: boolean;
}) => {
  const randString = new Types.ObjectId().toString();
  const newServer = await Server.create({
    name: randString,
    shortId: randString,
    owner,
    isPublic: isPublic,
  });
  await Member.create({ user: owner, server: newServer });

  return newServer;
};

const addMemberToServer = async (
  server: IServer,
  user: IUser,
  roles?: IRole[]
): Promise<IMember> => {
  return await Member.create({ user, server, roles });
};

beforeAll(async () => {
  await setupMongoDB();

  user1 = await User.create(user1Data);
  user2 = await User.create(user2Data);

  ownerToken = issueAuthToken(user1);
  otherUserToken = issueAuthToken(user2);
});

beforeEach(async () => {
  server1 = await Server.create({ ...server1Data, owner: user1 });
  await Member.create({ user: user1, server: server1 });
});

afterEach(async () => {
  await Channel.deleteMany({});
  await Role.deleteMany({});
  await Member.deleteMany({});
  await Server.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await teardownMongoDB();
});

describe("/server", () => {
  it("creates a server for the authenticated user", async () => {
    const payload: CreateServerInput = {
      name: "Brand New Server",
      description: "A friendly place",
      isPublic: true,
    };

    const { status, body } = await request(app)
      .post("/server")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(payload);

    expect(status).toBe(201);
    expect(body).toEqual({ shortId: expect.any(String) });

    const createdServer = await Server.findOne({ shortId: body.shortId });
    expect(createdServer).toBeTruthy();
    expect(createdServer?.name).toBe(payload.name);
    expect(createdServer?.owner.toString()).toBe(user1.id);

    const ownerMember = await Member.findOne({
      user: user1._id,
      server: createdServer?._id,
    });
    expect(ownerMember).toBeTruthy();
  });

  it("updates an owned server", async () => {
    const updatedServerData: UpdateServerInput = {
      name: "Updated server name",
      isPublic: false,
      description: "Updated server description",
    };

    const { status, body } = await request(app)
      .put(`/server/${server1.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(updatedServerData);

    expect(status).toBe(200);
    expect(body).toEqual(updatedServerData);

    const updatedServer = await Server.findById(server1.id);
    expect(updatedServer?.name).toBe(updatedServerData.name);
    expect(updatedServer?.description).toBe(updatedServerData.description);
  });

  it("deletes an owned server", async () => {
    const { status } = await request(app)
      .delete(`/server/${server1.id}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(status).toBe(204);

    const deletedServer = await Server.findById(server1.id);
    expect(deletedServer).toBeNull();

    const relatedMembers = await Member.find({ server: server1.id });
    expect(relatedMembers).toHaveLength(0);
  });

  it("lists all public servers", async () => {
    const server2 = await createServer({ owner: user2 });

    const { status, body } = await request(app)
      .get("/server/public")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(status).toBe(200);

    const data = body as ServerListDTO;
    expect(data.servers).toHaveLength(2);

    const returnedShortIds = data.servers.map((server) => server.shortId);
    expect(returnedShortIds).toEqual(
      expect.arrayContaining([server1.shortId, server2.shortId])
    );
  });

  it("lists all servers the user has joined", async () => {
    const server2 = await createServer({ owner: user2 });
    await addMemberToServer(server2, user1);

    const { status, body } = await request(app)
      .get("/server/joined")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(status).toBe(200);

    const data = body as ServerListDTO;
    expect(data.servers).toHaveLength(2);

    const returnedShortIds = data.servers.map((server) => server.shortId);
    expect(returnedShortIds).toEqual(
      expect.arrayContaining([server1.shortId, server2.shortId])
    );
  });

  it.only("returns detailed data for a server the user has joined", async () => {
    const server2 = await createServer({ owner: user2 });
    const role = await Role.create({ server: server2, name: "Role1" });
    const channel = await Channel.create({
      server: server2,
      name: "General",
      order: 1,
    });
    const channel2 = await Channel.create({
      server: server2,
      name: "Channel 2",
      order: 2,
    });
    addMemberToServer(server2, user1, [role]);

    const { status, body } = await request(app)
      .get(`/server/${server2.shortId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(status).toBe(200);

    const data = body as ServerDTO;
    expect(data.id).toBe(server2.id);
    expect(data.name).toBe(server2.name);
    expect(data.description).toBe(server2.description);
    expect(data.channels).toEqual([
      { id: channel.id, name: channel.name, order: channel.order },
      { id: channel2.id, name: channel2.name, order: channel2.order },
    ]);
    expect(data.members).toHaveLength(2);
    expect(data.members).toEqual(
      expect.arrayContaining([
        { name: user1.userName, roles: [role.name] },
        { name: user2.userName, roles: [] },
      ])
    );
  });

  it.only("returns only permitted channels of a server the user has joined", async () => {
    const server2 = await createServer({ owner: user2 });
    const role = await Role.create({ server: server2, name: "Role1" });
    const channel = await Channel.create({
      server: server2,
      name: "General",
      order: 1,
    });
    const channel2 = await Channel.create({
      server: server2,
      name: "Channel 2",
      order: 2,
      disallowedRoles: [role],
    });
    addMemberToServer(server2, user1, [role]);

    const { status, body } = await request(app)
      .get(`/server/${server2.shortId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(status).toBe(200);

    const data = body as ServerDTO;
    expect(data.channels).toEqual([
      { id: channel.id, name: channel.name, order: channel.order },
    ]);
  });

  it("joins a public server and creates a membership", async () => {
    const server2 = await createServer({ owner: user2 });

    const { status, body: rawBody } = await request(app)
      .post(`/server/${server2.shortId}/join`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(status).toBe(200);
    const body = rawBody as JoinServerDTO;
    expect(body.shortId).toBe(server2.shortId);

    const membership = await Member.findOne({
      user: user1._id,
      server: server2._id,
    });
    expect(membership).toBeTruthy();
  });

  it("prevents duplicate memberships when joining the same server twice", async () => {
    const server2 = await createServer({ owner: user2 });
    await addMemberToServer(server2, user1);

    await request(app)
      .post(`/server/${server2.shortId}/join`)
      .set("Authorization", `Bearer ${ownerToken}`);

    const secondJoin = await request(app)
      .post(`/server/${server2.shortId}/join`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(secondJoin.status).toBe(200);

    const membershipCount = await Member.countDocuments({
      user: user1._id,
      server: server2._id,
    });
    expect(membershipCount).toBe(1);
  });
});

describe("/server errors", () => {
  it("returns 401 when creating a server without authentication", async () => {
    const payload: CreateServerInput = {
      name: "Unauthorized server",
      description: "Should not be created",
      isPublic: true,
    };

    const res = await request(app).post("/server").send(payload);

    expectUnauthorized(res);
  });

  it("returns 400 when creating a server without required fields", async () => {
    const res = await request(app)
      .post("/server")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ isPublic: true } as Partial<CreateServerInput>);

    expectBadRequest(res);
  });

  it("returns 404 when updating a non-existent server", async () => {
    const missingId = new Types.ObjectId().toString();
    const res = await request(app)
      .put(`/server/${missingId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        name: "Updated",
        description: "Desc",
        isPublic: true,
      } satisfies UpdateServerInput);

    expectNotFound(res);
  });

  it("returns 400 when updating a server with invalid payload", async () => {
    const res = await request(app)
      .put(`/server/${server1.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({});

    expectBadRequest(res);
  });

  it("returns 400 when updating a server with malformed fields", async () => {
    const res = await request(app)
      .put(`/server/${server1.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        name: "   ",
        description: "Invalid payload",
        isPublic: "yes" as unknown as boolean,
      });

    expectBadRequest(res);
  });

  it("returns 403 when updating a server the user does not own", async () => {
    const res = await request(app)
      .put(`/server/${server1.id}`)
      .set("Authorization", `Bearer ${otherUserToken}`)
      .send({
        name: "Hack attempt",
        description: "Should not work",
        isPublic: true,
      } satisfies UpdateServerInput);

    expectForbidden(res);
  });

  it("returns 400 when the server id parameter is malformed", async () => {
    const res = await request(app)
      .put("/server/not-an-object-id")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        name: "Valid name",
        description: "Desc",
        isPublic: true,
      } satisfies UpdateServerInput);

    expectBadRequest(res);
  });

  it("returns 404 when deleting a non-existent server", async () => {
    const missingId = new Types.ObjectId().toString();
    const res = await request(app)
      .delete(`/server/${missingId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expectNotFound(res);
  });

  it("returns 403 when deleting a server the user does not own", async () => {
    const res = await request(app)
      .delete(`/server/${server1.id}`)
      .set("Authorization", `Bearer ${otherUserToken}`);

    expectForbidden(res);
  });

  it("returns 404 when requesting details for a non-existent server", async () => {
    const res = await request(app)
      .get("/server/unknown")
      .set("Authorization", `Bearer ${ownerToken}`);

    expectNotFound(res);
  });

  it("returns 403 when requesting details for a server the user has not joined", async () => {
    const server2 = await createServer({ owner: user2 });

    const res = await request(app)
      .get(`/server/${server2.shortId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expectForbidden(res);
  });

  it("returns 404 when trying to join a non-existent server", async () => {
    const res = await request(app)
      .post("/server/nope/join")
      .set("Authorization", `Bearer ${ownerToken}`);

    expectNotFound(res);
  });

  it("returns 403 when trying to join a private server without permission", async () => {
    const server2 = await createServer({ owner: user2, isPublic: false });

    const res = await request(app)
      .post(`/server/${server2.shortId}/join`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expectForbidden(res);
  });
});
