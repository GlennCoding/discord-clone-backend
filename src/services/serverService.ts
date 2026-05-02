import { RolePermission } from '../models/Role';
import { CustomError } from '../utils/errors';
import { ensureParam } from '../utils/helper';
import { randomShortId } from '../utils/ids';

import type { ServerRepository } from '../repositories/serverRepository';
import type { ChannelDTO, MemberDTO, ServerListItemDTO } from '../types/dto';
import type { ChannelEntity, PopulatedMemberEntity, RoleEntity, ServerEntity } from '../types/entities';

export { RolePermission };

export const ensureShortId = (shortIdParam: string | undefined) => {
  const shortId = ensureParam('shortId', shortIdParam).toUpperCase();
  if (shortId.length !== 6 || !/^[A-Z0-9]+$/.test(shortId)) {
    throw new CustomError(400, 'shortId is invalid');
  }
  return shortId;
};

export const toChannelDTO = (channel: ChannelEntity): ChannelDTO => ({
  id: channel.id,
  name: channel.name,
  order: channel.order,
});

export const toMemberDTO = (member: PopulatedMemberEntity): MemberDTO => ({
  name: member.nickname || member.user.userName,
  roles: member.roles.map((r) => r.name),
  avatarUrl: member.user.avatar?.url,
});

export const toServerListItemDTO = (servers: ServerEntity[]): ServerListItemDTO[] =>
  servers.map((s) => ({
    name: s.name,
    shortId: s.shortId,
    description: s.description,
    iconUrl: s.iconUrl,
  }));

export const checkPermissionInRoles = (
  roles: Pick<RoleEntity, 'permissions'>[],
  permission: string,
): boolean => roles.some((r) => r.permissions.includes(permission));

export const filterDisallowedChannels = (
  channels: ChannelEntity[],
  memberRoleIds: string[],
): ChannelEntity[] =>
  channels.filter(
    (c) => !c.disallowedRoleIds.some((roleId) => memberRoleIds.includes(roleId)),
  );

export const generateUniqueShortId = async (): Promise<string> => {
  let shortId = randomShortId();
  const { default: Server } = await import('../models/Server');
  while (await Server.exists({ shortId })) {
    shortId = randomShortId();
  }
  return shortId;
};

export class ServerService {
  constructor(private server: ServerRepository) {}

  async generateUniqueShortId(): Promise<string> {
    let shortId = randomShortId();
    while (await this.server.shortIdExists(shortId)) {
      shortId = randomShortId();
    }
    return shortId;
  }

  findById(id: string) {
    return this.server.findById(id);
  }

  findByShortId(shortId: string) {
    return this.server.findByShortId(shortId);
  }

  findAllPublic() {
    return this.server.findAllPublic();
  }

  async createServer(data: {
    name: string;
    description?: string;
    isPublic: boolean;
    ownerId: string;
  }) {
    const shortId = await this.generateUniqueShortId();
    return this.server.create({ ...data, shortId });
  }

  updateServer(id: string, data: { name: string; description?: string; isPublic: boolean }) {
    return this.server.update(id, data);
  }

  deleteWithRelated(serverId: string) {
    return this.server.deleteWithRelated(serverId);
  }

  getChannels(serverId: string) {
    return this.server.getChannels(serverId);
  }

  getChannelsSorted(serverId: string) {
    return this.server.getChannelsSorted(serverId);
  }

  getMembers(serverId: string) {
    return this.server.getMembers(serverId);
  }

  findMember(serverId: string, userId: string) {
    return this.server.findMember(serverId, userId);
  }

  findPopulatedMember(serverId: string, userId: string) {
    return this.server.findPopulatedMember(serverId, userId);
  }

  createMember(serverId: string, userId: string) {
    return this.server.createMember(serverId, userId);
  }

  findJoinedByUserId(userId: string) {
    return this.server.findJoinedByUserId(userId);
  }
}
