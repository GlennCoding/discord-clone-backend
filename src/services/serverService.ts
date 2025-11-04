import { IChannel } from "../models/Channel";
import { IMember } from "../models/Member";
import { IRole, RolePermission } from "../models/Role";
import Server, { IServer } from "../models/Server";
import { ServerListItemDTO, ChannelDTO, MemberDTO } from "../types/dto";
import { CustomError } from "../utils/errors";
import { ensureParam } from "../utils/helper";
import { randomShortId } from "../utils/ids";

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

export const checkPermissionInRoles = (
  roles: IRole[],
  permission: RolePermission
) => {
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
  memberRoles: IRole[]
) => {
  for (const disallowedRole of disAllowedRoles) {
    if (memberRoles.some((memberRole) => memberRole.id === disallowedRole.id))
      return true;
  }
  return false;
};

export const filterDisallowedRolesOfChannels = (
  channels: IChannel[],
  memberRoles: IRole[]
) => {
  const allowedChannels: IChannel[] = [];
  for (const c of channels) {
    const memberHasNoAccessToChannel = checkIfMemberRolesIncludedInDisallowedRoles(
      c.disallowedRoles,
      memberRoles
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
