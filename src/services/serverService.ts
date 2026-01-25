import mongoose from "mongoose";

import Channel from "../models/Channel";
import ChannelMessage from "../models/ChannelMessage";
import Member from "../models/Member";
import Role from "../models/Role";
import Server from "../models/Server";
import { CustomError } from "../utils/errors";
import { ensureParam } from "../utils/helper";
import { randomShortId } from "../utils/ids";

import type { IChannel } from "../models/Channel";
import type { IMember } from "../models/Member";
import type { IRole, RolePermission } from "../models/Role";
import type { IServer } from "../models/Server";
import type { ServerListItemDTO, ChannelDTO, MemberDTO } from "../types/dto";
import type { Types } from "mongoose";

export const ensureShortId = (shortIdParam: string | undefined) => {
  const shortId = ensureParam("shortId", shortIdParam).toUpperCase();
  if (shortId.length !== 6 || !/^[A-Z0-9]+$/.test(shortId)) {
    throw new CustomError(400, "shortId is invalid");
  }
  return shortId;
};

export const generateUniqueShortId = async (): Promise<string> => {
  let shortId = randomShortId();

  while (await Server.exists({ shortId })) {
    shortId = randomShortId();
  }
  return shortId;
};

export const checkPermissionInRoles = (roles: IRole[], permission: RolePermission) => {
  for (const role of roles) {
    const hasPermission = role.permissions.some((p) => p === permission);
    if (hasPermission) return true;
  }
  return false;
};

export const toServerListItemDTO = (servers: IServer[]): ServerListItemDTO[] => {
  return servers.map((s) => ({
    name: s.name,
    shortId: s.shortId,
    description: s.description,
    iconUrl: s.iconUrl,
  }));
};

const checkIfMemberRolesIncludedInDisallowedRoles = (
  disAllowedRoles: IRole[],
  memberRoles: IRole[],
) => {
  for (const disallowedRole of disAllowedRoles) {
    if (memberRoles.some((memberRole) => memberRole.id === disallowedRole.id)) return true;
  }
  return false;
};

export const filterDisallowedRolesOfChannels = (channels: IChannel[], memberRoles: IRole[]) => {
  const allowedChannels: IChannel[] = [];
  for (const c of channels) {
    const memberHasNoAccessToChannel = checkIfMemberRolesIncludedInDisallowedRoles(
      c.disallowedRoles,
      memberRoles,
    );
    if (memberHasNoAccessToChannel) continue;

    allowedChannels.push(c);
  }
  return allowedChannels;
};

export const toChannelDTO = ({ _id, name, order }: IChannel): ChannelDTO => ({
  id: _id.toString(),
  name,
  order,
});

export const toMemberDTO = ({ roles, user, nickname }: IMember): MemberDTO => ({
  name: nickname || user.userName,
  roles: roles.map((r) => r.name),
  avatarUrl: user.avatar?.url,
});

export const getAllChannelIdsOfServer = async (serverId: string) =>
  await Channel.find({ server: serverId }).distinct("_id");

export const deleteServerInDB = async (serverId: string, channelIds: Types.ObjectId[]) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Promise.all([
        ChannelMessage.deleteMany({ channel: { $in: channelIds } }),
        Channel.deleteMany({ server: serverId }),
        Role.deleteMany({ server: serverId }),
        Member.deleteMany({ server: serverId }),
        Server.deleteOne(),
      ]);
    });
  } catch (err) {
    console.error("Transaction failed:", err);
    throw err;
  } finally {
    await session.endSession();
  }
};
