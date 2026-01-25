import { isDeepStrictEqual } from "util";

import z from "zod";

import { io } from "../app";
import Channel from "../models/Channel";
import Member from "../models/Member";
import { RolePermission } from "../models/Role";
import Server from "../models/Server";
import {
  generateUniqueShortId,
  checkPermissionInRoles,
  toServerListItemDTO,
  ensureShortId,
  filterDisallowedRolesOfChannels,
  toChannelDTO,
  toMemberDTO,
  getAllChannelIdsOfServer,
  deleteServerInDB,
} from "../services/serverService";
import { auditHttp } from "../utils/audit";
import { CustomError, NoPermissionError, NotFoundError } from "../utils/errors";
import { ensureParam, ensureUser } from "../utils/helper";
import { serverRoom } from "../utils/socketRooms";
import { parseWithSchema } from "../utils/validators";

import type { UserRequest } from "../middleware/verifyJWT";
import type { IServer } from "../models/Server";
import type {
  CreateServerDTO,
  CreateServerInput,
  JoinServerDTO,
  ServerDTO,
  ServerListDTO,
  ServerListItemDTO,
  UpdateServerDTO,
  UpdateServerInput,
  UpdatedServerDTO,
} from "../types/dto";
import type { Response } from "express";

const baseServerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().max(500).optional(),
  isPublic: z.boolean(),
});

export const createServerSchema = baseServerSchema;
export const updateServerSchema = baseServerSchema;

export const createServer = async (
  req: UserRequest<CreateServerInput>,
  res: Response<CreateServerDTO>,
) => {
  const payload = parseWithSchema(createServerSchema, req.body);
  const owner = await ensureUser(req.userId);

  const shortId = await generateUniqueShortId();

  const server = await Server.create({ ...payload, owner, shortId });
  await Member.create({ user: owner._id, server: server._id });

  auditHttp(req, "SERVER_CREATED", { serverId: server.id });

  res.status(201).json({ shortId } satisfies CreateServerDTO);
};

export const updateServer = async (
  req: UserRequest<UpdateServerInput>,
  res: Response<UpdateServerDTO>,
) => {
  const serverId = ensureParam("id", req.params.id, { isObjectId: true });
  const payload = parseWithSchema(updateServerSchema, req.body);
  const user = await ensureUser(req.userId);

  // check if server exists
  const foundServer = await Server.findById(serverId).populate("owner");
  if (!foundServer) throw new NotFoundError("Server");

  // check if user has permission
  const foundMember = await Member.findOne({ user, server: foundServer }).populate(
    "roles",
    "permissions",
  );
  if (!foundMember) throw new CustomError(403, "You are no member of this server");

  const isOwner = foundServer.owner.id === user.id;

  const hasServerAdminPermission = checkPermissionInRoles(
    foundMember.roles,
    RolePermission.ServerAdmin,
  );

  if (!isOwner && !hasServerAdminPermission) throw new NoPermissionError();

  // upate server document
  const serverContents = {
    name: foundServer.name,
    isPublic: foundServer.isPublic,
    description: foundServer.description,
  };

  if (isDeepStrictEqual(serverContents, payload)) {
    res.status(200).json(serverContents);
    return;
  }

  foundServer.name = payload.name;
  foundServer.description = payload.description;
  foundServer.isPublic = payload.isPublic;
  const updatedServer = await foundServer.save();

  const responseBody = {
    name: updatedServer.name,
    isPublic: updatedServer.isPublic,
    description: updatedServer.description,
  };

  auditHttp(req, "SERVER_UPDATED", { serverId: foundServer.id });

  res.status(200).json(responseBody);

  const updatedServerDTO: UpdatedServerDTO = {
    id: updatedServer.id,
    name: updatedServer.name,
    description: updatedServer.description,
    iconUrl: updatedServer.iconUrl,
  };

  io.to(serverRoom(updatedServer.id)).emit("server:updated", updatedServerDTO);
};

export const deleteServer = async (req: UserRequest, res: Response) => {
  const serverId = ensureParam("id", req.params.id, { isObjectId: true });
  const user = await ensureUser(req.userId);

  const server = await Server.findById(serverId).populate("owner");
  if (!server) throw new NotFoundError("Server");

  if (server.owner.id !== user.id) throw new NoPermissionError();

  const channelIds = await getAllChannelIdsOfServer(server.id);

  await deleteServerInDB(server.id, channelIds);

  auditHttp(req, "SERVER_DELETED", { serverId: server.id });

  res.sendStatus(204);

  io.to(serverRoom(server.id)).emit("server:deleted", server.id);
};

export const getAllPublicServers = async (_: UserRequest, res: Response<ServerListDTO>) => {
  const servers = await Server.find({ isPublic: true });
  const serverDTOs: ServerListItemDTO[] = toServerListItemDTO(servers);

  res.status(200).json({ servers: serverDTOs });
};

export const getAllJoinedServers = async (req: UserRequest, res: Response<ServerListDTO>) => {
  const user = await ensureUser(req.userId);
  const members = await Member.find({ user }).populate("server");

  const servers: IServer[] = members.map((m) => m.server);
  const serverDTOs: ServerListItemDTO[] = toServerListItemDTO(servers);

  res.status(200).json({ servers: serverDTOs });
};

export const getServer = async (req: UserRequest, res: Response<ServerDTO>) => {
  const shortId = ensureShortId(req.params.shortId);
  const user = await ensureUser(req.userId);

  const server = await Server.findOne({ shortId });
  if (!server) throw new NotFoundError("Server");

  const allChannelMembers = await Member.find({ server })
    .populate("user")
    .populate("roles", "_id name permissions");
  const currentMember = allChannelMembers.find((m) => m.user.id === user.id);

  if (!currentMember) throw new CustomError(403, "You are no member of this server");

  const channels = await Channel.find({ server }).populate("disallowedRoles", "_id");

  const allowedChannels = filterDisallowedRolesOfChannels(channels, currentMember.roles);

  res.status(200).json({
    id: server.id,
    name: server.name,
    channels: allowedChannels.map((c) => toChannelDTO(c)),
    description: server.description,
    iconUrl: server.iconUrl,
    members: allChannelMembers.map((m) => toMemberDTO(m)),
  });
};

export const joinServer = async (req: UserRequest, res: Response<JoinServerDTO>) => {
  const shortId = ensureShortId(req.params.shortId);
  const user = await ensureUser(req.userId);

  const server = await Server.findOne({ shortId });
  if (!server) throw new NotFoundError("Server");

  const member = await Member.findOne({ server, user });

  if (!server.isPublic && !member) {
    throw new CustomError(403, "This server is private");
  } else if (!member) {
    await Member.create({ server, user });
  }

  res.status(200).json({ shortId: shortId });
};
