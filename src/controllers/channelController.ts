import { Response } from "express";
import z from "zod";
import { UserRequest } from "../middleware/verifyJWT";
import { ChannelDTO } from "../types/dto";
import { parseWithSchema } from "../utils/validators";
import { ensureParam, ensureUser } from "../utils/helper";
import Server from "../models/Server";
import Member from "../models/Member";
import Channel from "../models/Channel";
import { CustomError, NoPermissionError, NotFoundError } from "../utils/errors";
import { toChannelDTO } from "../services/serverService";

const channelPayloadSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

const ensureServerOwner = async (serverIdParam: string | undefined, userId?: string) => {
  const serverId = ensureParam("serverId", serverIdParam, { isObjectId: true });
  const [user, server] = await Promise.all([
    ensureUser(userId),
    Server.findById(serverId).populate("owner"),
  ]);

  if (!server) throw new NotFoundError("Server");

  const member = await Member.findOne({ server, user });
  if (!member) throw new CustomError(403, "You are no member of this server");

  if (server.owner.id !== user.id) throw new NoPermissionError();

  return { server, user };
};

export const createChannel = async (
  req: UserRequest<{ name: string }>,
  res: Response<ChannelDTO>
) => {
  const { server } = await ensureServerOwner(req.params.serverId, req.userId);
  const payload = parseWithSchema(channelPayloadSchema, req.body);

  const lastChannel = await Channel.findOne({ server }).sort("-order");
  const nextOrder = lastChannel ? lastChannel.order + 1 : 1;

  const channel = await Channel.create({
    server,
    name: payload.name,
    order: nextOrder,
  });

  res.status(201).json(toChannelDTO(channel));
};

export const updateChannel = async (
  req: UserRequest<{ name: string }>,
  res: Response<ChannelDTO>
) => {
  const { server } = await ensureServerOwner(req.params.serverId, req.userId);
  const channelId = ensureParam("channelId", req.params.channelId, { isObjectId: true });
  const payload = parseWithSchema(channelPayloadSchema, req.body);

  const channel = await Channel.findOne({ _id: channelId, server });
  if (!channel) throw new NotFoundError("Channel");

  channel.name = payload.name;
  const updatedChannel = await channel.save();

  res.status(200).json(toChannelDTO(updatedChannel));
};

export const deleteChannel = async (req: UserRequest, res: Response) => {
  const { server } = await ensureServerOwner(req.params.serverId, req.userId);
  const channelId = ensureParam("channelId", req.params.channelId, { isObjectId: true });

  const deleted = await Channel.findOneAndDelete({ _id: channelId, server });
  if (!deleted) throw new NotFoundError("Channel");

  res.sendStatus(204);
};
