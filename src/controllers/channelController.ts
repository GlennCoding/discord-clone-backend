import z from "zod";

import { io } from "../app";
import Channel from "../models/Channel";
import Member from "../models/Member";
import Server from "../models/Server";
import { toChannelDTO } from "../services/serverService";
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
  const { params, userId } = req;
  ensureParam("serverId", params.serverId, { isObjectId: true });

  const [user, server] = await Promise.all([
    ensureUser(userId),
    Server.findById(params.serverId).populate("owner"),
  ]);

  if (!server) throw new NotFoundError("Server");

  const member = await Member.findOne({ server, user });
  if (!member) {
    auditHttp(req, "ACCESS_DENIED");
    throw new NoAccessError(`server: ${server.name}`);
  }

  if (server.owner.id !== user.id) throw new NoPermissionError();

  return { server, user };
};

export const createChannel = async (
  req: UserRequest<{ name: string }>,
  res: Response<ChannelDTO>,
) => {
  const { server } = await ensureServerOwner(req);
  const payload = parseWithSchema(channelPayloadSchema, req.body);

  const lastChannel = await Channel.findOne({ server }).sort("-order");
  const nextOrder = lastChannel ? lastChannel.order + 1 : 1;

  const channel = await Channel.create({
    server,
    name: payload.name,
    order: nextOrder,
  });

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
  const channelId = ensureParam("channelId", req.params.channelId, {
    isObjectId: true,
  });
  const payload = parseWithSchema(channelPayloadSchema, req.body);

  const channel = await Channel.findOne({ _id: channelId, server });
  if (!channel) throw new NotFoundError("Channel");

  channel.name = payload.name;
  const updatedChannel = await channel.save();
  const updatedDTO = toChannelDTO(updatedChannel);

  auditHttp(req, "CHANNEL_UPDATED", { channelId });
  res.status(200).json(updatedDTO);
  io.to(serverRoom(server.id)).emit("channel:updated", updatedDTO);
};

export const deleteChannel = async (req: UserRequest, res: Response) => {
  const { server } = await ensureServerOwner(req);
  const channelId = ensureParam("channelId", req.params.channelId, {
    isObjectId: true,
  });

  const deleted = await Channel.findOneAndDelete({ _id: channelId, server });
  if (!deleted) throw new NotFoundError("Channel");

  auditHttp(req, "CHANNEL_DELETED", { channelId });
  io.to(serverRoom(server.id)).emit("channel:deleted", deleted.id);
  res.sendStatus(204);
};
