import prisma from '../config/prismaClient';

import type { CreateServerData, ServerRepository, UpdateServerData } from './serverRepository';
import type {
  ChannelEntity,
  MemberEntity,
  PopulatedMemberEntity,
  RoleEntity,
  ServerEntity,
} from '../types/entities';
import type {
  Channel,
  ChannelDisallowedRole,
  Member,
  MemberRole,
  Role,
  Server,
  User,
} from '../generated/prisma/client';

type ServerRow = Server;
type ChannelRow = Channel & { disallowedRoles: ChannelDisallowedRole[] };
type RoleRow = Role;
type MemberRow = Member & { roles: MemberRole[] };
type PopulatedMemberRow = Member & {
  roles: (MemberRole & { role: Role })[];
  user: User;
};

const mapServer = (doc: ServerRow): ServerEntity => ({
  id: doc.id,
  name: doc.name,
  shortId: doc.shortId,
  iconUrl: doc.iconUrl ?? undefined,
  ownerId: doc.ownerId,
  description: doc.description ?? undefined,
  isPublic: doc.isPublic,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const mapChannel = (doc: ChannelRow): ChannelEntity => ({
  id: doc.id,
  serverId: doc.serverId,
  name: doc.name,
  order: doc.order,
  disallowedRoleIds: doc.disallowedRoles.map((r) => r.roleId),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const mapRole = (doc: RoleRow): RoleEntity => ({
  id: doc.id,
  serverId: doc.serverId,
  name: doc.name,
  permissions: doc.permissions,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const mapMember = (doc: MemberRow): MemberEntity => ({
  id: doc.id,
  serverId: doc.serverId,
  userId: doc.userId,
  nickname: doc.nickname ?? undefined,
  roleIds: doc.roles.map((r) => r.roleId),
  joinedDate: doc.joinedDate,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const mapPopulatedMember = (doc: PopulatedMemberRow): PopulatedMemberEntity => ({
  id: doc.id,
  serverId: doc.serverId,
  userId: doc.userId,
  nickname: doc.nickname ?? undefined,
  roleIds: doc.roles.map((r) => r.roleId),
  joinedDate: doc.joinedDate,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  user: {
    id: doc.user.id,
    userName: doc.user.userName,
    avatar:
      doc.user.avatarFilePath && doc.user.avatarUrl
        ? { filePath: doc.user.avatarFilePath, url: doc.user.avatarUrl }
        : undefined,
  },
  roles: doc.roles.map((mr) => ({
    id: mr.role.id,
    name: mr.role.name,
    permissions: mr.role.permissions,
  })),
});

class PrismaServerRepository implements ServerRepository {
  async findById(id: string) {
    const doc = await prisma.server.findUnique({ where: { id } });
    return doc ? mapServer(doc) : null;
  }

  async findByShortId(shortId: string) {
    const doc = await prisma.server.findUnique({ where: { shortId } });
    return doc ? mapServer(doc) : null;
  }

  async shortIdExists(shortId: string) {
    return !!(await prisma.server.findUnique({ where: { shortId }, select: { id: true } }));
  }

  async findAllPublic() {
    const docs = await prisma.server.findMany({ where: { isPublic: true } });
    return docs.map(mapServer);
  }

  async findJoinedByUserId(userId: string) {
    const members = await prisma.member.findMany({
      where: { userId },
      include: { server: true },
    });
    return members.map((m) => mapServer(m.server));
  }

  async create(data: CreateServerData) {
    const doc = await prisma.server.create({
      data: {
        name: data.name,
        description: data.description,
        isPublic: data.isPublic,
        ownerId: data.ownerId,
        shortId: data.shortId,
      },
    });
    return mapServer(doc);
  }

  async update(id: string, data: UpdateServerData) {
    const doc = await prisma.server.update({
      where: { id },
      data: { name: data.name, description: data.description, isPublic: data.isPublic },
    });
    return mapServer(doc);
  }

  async deleteWithRelated(serverId: string) {
    const channelIds = await prisma.channel
      .findMany({ where: { serverId }, select: { id: true } })
      .then((rows) => rows.map((r) => r.id));

    await prisma.$transaction([
      prisma.channelMessageAttachment.deleteMany({
        where: { message: { channelId: { in: channelIds } } },
      }),
      prisma.channelMessage.deleteMany({ where: { channelId: { in: channelIds } } }),
      prisma.channelDisallowedRole.deleteMany({ where: { channelId: { in: channelIds } } }),
      prisma.channel.deleteMany({ where: { serverId } }),
      prisma.memberRole.deleteMany({ where: { member: { serverId } } }),
      prisma.member.deleteMany({ where: { serverId } }),
      prisma.role.deleteMany({ where: { serverId } }),
      prisma.server.delete({ where: { id: serverId } }),
    ]);
  }

  async getChannels(serverId: string) {
    const docs = await prisma.channel.findMany({
      where: { serverId },
      include: { disallowedRoles: true },
    });
    return docs.map(mapChannel);
  }

  async getChannelsSorted(serverId: string) {
    const docs = await prisma.channel.findMany({
      where: { serverId },
      orderBy: { order: 'asc' },
      include: { disallowedRoles: true },
    });
    return docs.map(mapChannel);
  }

  async getMembers(serverId: string) {
    const docs = await prisma.member.findMany({
      where: { serverId },
      include: { user: true, roles: { include: { role: true } } },
    });
    return docs.map(mapPopulatedMember);
  }

  async findMember(serverId: string, userId: string) {
    const doc = await prisma.member.findUnique({
      where: { serverId_userId: { serverId, userId } },
      include: { roles: true },
    });
    return doc ? mapMember(doc) : null;
  }

  async findPopulatedMember(serverId: string, userId: string) {
    const doc = await prisma.member.findUnique({
      where: { serverId_userId: { serverId, userId } },
      include: { user: true, roles: { include: { role: true } } },
    });
    return doc ? mapPopulatedMember(doc) : null;
  }

  async createMember(serverId: string, userId: string) {
    const doc = await prisma.member.create({
      data: { serverId, userId },
      include: { roles: true },
    });
    return mapMember(doc);
  }

  async getRoles(serverId: string) {
    const docs = await prisma.role.findMany({ where: { serverId } });
    return docs.map(mapRole);
  }
}

export default PrismaServerRepository;
