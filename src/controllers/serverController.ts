import { isDeepStrictEqual } from "util";

import z from "zod";

import { io } from "../app";
import { serverService } from "../container";
import {
  checkPermissionInRoles,
  ensureShortId,
  filterDisallowedChannels,
  RolePermission,
  toChannelDTO,
  toMemberDTO,
  toServerListItemDTO,
} from "../services/serverService";
import { auditHttp } from "../utils/audit";
import { CustomError, NoPermissionError, NotFoundError } from "../utils/errors";
import { ensureParam, ensureUser } from "../utils/helper";
import { serverRoom } from "../utils/socketRooms";
import { parseWithSchema } from "../utils/validators";

import type { UserRequest } from "../middleware/verifyJWT";
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
  const user = await ensureUser(req.userId);

  const server = await serverService.createServer({ ...payload, ownerId: user.id });

  await serverService.createMember(server.id, user.id);

  auditHttp(req, "SERVER_CREATED", { serverId: server.id });

  res.status(201).json({ shortId: server.shortId } satisfies CreateServerDTO);
};

export const updateServer = async (
  req: UserRequest<UpdateServerInput>,
  res: Response<UpdateServerDTO>,
) => {
  const serverId = ensureParam("id", req.params.id, { isObjectId: true });
  const payload = parseWithSchema(updateServerSchema, req.body);
  const user = await ensureUser(req.userId);

  const foundServer = await serverService.findById(serverId);
  if (!foundServer) throw new NotFoundError("Server");

  const foundMember = await serverService.findPopulatedMember(serverId, user.id);
  if (!foundMember) throw new CustomError(403, "You are no member of this server");

  const isOwner = foundServer.ownerId === user.id;
  const hasServerAdminPermission = checkPermissionInRoles(
    foundMember.roles,
    RolePermission.ServerAdmin,
  );

  if (!isOwner && !hasServerAdminPermission) throw new NoPermissionError();

  const serverContents = {
    name: foundServer.name,
    isPublic: foundServer.isPublic,
    description: foundServer.description,
  };

  if (isDeepStrictEqual(serverContents, payload)) {
    res.status(200).json(serverContents);
    return;
  }

  const updated = await serverService.updateServer(serverId, payload);
  if (!updated) throw new NotFoundError("Server");

  const responseBody = {
    name: updated.name,
    isPublic: updated.isPublic,
    description: updated.description,
  };

  auditHttp(req, "SERVER_UPDATED", { serverId });

  res.status(200).json(responseBody);

  io.to(serverRoom(updated.id)).emit("server:updated", {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    iconUrl: updated.iconUrl,
  } satisfies UpdatedServerDTO);
};

export const deleteServer = async (req: UserRequest, res: Response) => {
  const serverId = ensureParam("id", req.params.id, { isObjectId: true });
  const user = await ensureUser(req.userId);

  const server = await serverService.findById(serverId);
  if (!server) throw new NotFoundError("Server");

  if (server.ownerId !== user.id) throw new NoPermissionError();

  await serverService.deleteWithRelated(serverId);

  auditHttp(req, "SERVER_DELETED", { serverId });

  res.sendStatus(204);

  io.to(serverRoom(server.id)).emit("server:deleted", server.id);
};

export const getAllPublicServers = async (_: UserRequest, res: Response<ServerListDTO>) => {
  const servers = await serverService.findAllPublic();
  const serverDTOs: ServerListItemDTO[] = toServerListItemDTO(servers);

  res.status(200).json({ servers: serverDTOs });
};

export const getAllJoinedServers = async (req: UserRequest, res: Response<ServerListDTO>) => {
  const user = await ensureUser(req.userId);
  const servers = await serverService.findJoinedByUserId(user.id);
  res.status(200).json({ servers: toServerListItemDTO(servers) });
};

export const getServer = async (req: UserRequest, res: Response<ServerDTO>) => {
  const shortId = ensureShortId(req.params.shortId);
  const user = await ensureUser(req.userId);

  const server = await serverService.findByShortId(shortId);
  if (!server) throw new NotFoundError("Server");

  const allMembers = await serverService.getMembers(server.id);
  const currentMember = allMembers.find((m) => m.userId === user.id);
  if (!currentMember) throw new CustomError(403, "You are no member of this server");

  const channels = await serverService.getChannels(server.id);
  const allowedChannels = filterDisallowedChannels(channels, currentMember.roleIds);

  res.status(200).json({
    id: server.id,
    name: server.name,
    channels: allowedChannels.map(toChannelDTO),
    description: server.description,
    iconUrl: server.iconUrl,
    members: allMembers.map(toMemberDTO),
  } satisfies ServerDTO);
};

export const joinServer = async (req: UserRequest, res: Response<JoinServerDTO>) => {
  const shortId = ensureShortId(req.params.shortId);
  const user = await ensureUser(req.userId);

  const server = await serverService.findByShortId(shortId);
  if (!server) throw new NotFoundError("Server");

  const member = await serverService.findMember(server.id, user.id);

  if (!server.isPublic && !member) {
    throw new CustomError(403, "This server is private");
  } else if (!member) {
    await serverService.createMember(server.id, user.id);
  }

  res.status(200).json({ shortId });
};
