import z from "zod";

import { io } from "../app";
import { channelService } from "../container";
import { toChannelDTO } from "../services/channelService";
import { auditHttp } from "../utils/audit";
import { NoAccessError, NoPermissionError, NotFoundError } from "../utils/errors";
import { ensureParam, ensureUser } from "../utils/helper";
import { serverRoom } from "../utils/socketRooms";
import { parseWithSchema } from "../utils/validators";

import type { UserRequest } from "../middleware/verifyJWT";
import type { ChannelDTO } from "../types/dto";
import type { Response } from "express";

const channelPayloadSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

const ensureServerOwner = async (req: UserRequest) => {
  ensureParam("serverId", req.params.serverId, { isObjectId: true });
  const user = await ensureUser(req.userId);
  const server = await channelService.ensureServerOwner(req.params.serverId, user.id);
  return { server, user };
};

export const createChannel = async (
  req: UserRequest<{ name: string }>,
  res: Response<ChannelDTO>,
) => {
  const { server } = await ensureServerOwner(req);
  const payload = parseWithSchema(channelPayloadSchema, req.body);

  const channel = await channelService.createChannel(server.id, payload.name);
  const channelDTO = toChannelDTO(channel);

  auditHttp(req, "CHANNEL_CREATED", { channelId: channel.id });
  res.status(201).json(channelDTO);
  io.to(serverRoom(server.id)).emit("channel:created", channelDTO);
};

export const updateChannel = async (
  req: UserRequest<{ name: string }>,
  res: Response<ChannelDTO>,
) => {
  const { server } = await ensureServerOwner(req);
  const channelId = ensureParam("channelId", req.params.channelId, { isObjectId: true });
  const payload = parseWithSchema(channelPayloadSchema, req.body);

  const updated = await channelService.updateChannel(channelId, server.id, payload.name);
  const updatedDTO = toChannelDTO(updated);

  auditHttp(req, "CHANNEL_UPDATED", { channelId });
  res.status(200).json(updatedDTO);
  io.to(serverRoom(server.id)).emit("channel:updated", updatedDTO);
};

export const deleteChannel = async (req: UserRequest, res: Response) => {
  const { server } = await ensureServerOwner(req);
  const channelId = ensureParam("channelId", req.params.channelId, { isObjectId: true });

  await channelService.deleteChannel(channelId, server.id);

  auditHttp(req, "CHANNEL_DELETED", { channelId });
  io.to(serverRoom(server.id)).emit("channel:deleted", channelId);
  res.sendStatus(204);
};
