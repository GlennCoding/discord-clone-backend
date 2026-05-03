import prisma from '../config/prismaClient';

import type { ChannelRepository, CreateChannelData, UpdateChannelData } from './channelRepository';
import type { ChannelEntity } from '../types/entities';
import type { Channel, ChannelDisallowedRole } from '../generated/prisma/client';

type ChannelRow = Channel & { disallowedRoles: ChannelDisallowedRole[] };

const mapChannel = (doc: ChannelRow): ChannelEntity => ({
  id: doc.id,
  serverId: doc.serverId,
  name: doc.name,
  order: doc.order,
  disallowedRoleIds: doc.disallowedRoles.map((r) => r.roleId),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const include = { disallowedRoles: true } as const;

class PrismaChannelRepository implements ChannelRepository {
  async findById(id: string) {
    const doc = await prisma.channel.findUnique({ where: { id }, include });
    return doc ? mapChannel(doc) : null;
  }

  async findByServerId(serverId: string) {
    const docs = await prisma.channel.findMany({ where: { serverId }, include });
    return docs.map(mapChannel);
  }

  async findLastByServerId(serverId: string) {
    const doc = await prisma.channel.findFirst({
      where: { serverId },
      orderBy: { order: 'desc' },
      include,
    });
    return doc ? mapChannel(doc) : null;
  }

  async findByIdAndServerId(id: string, serverId: string) {
    const doc = await prisma.channel.findFirst({ where: { id, serverId }, include });
    return doc ? mapChannel(doc) : null;
  }

  async create(data: CreateChannelData) {
    const doc = await prisma.channel.create({
      data: { serverId: data.serverId, name: data.name, order: data.order },
      include,
    });
    return mapChannel(doc);
  }

  async update(id: string, data: UpdateChannelData) {
    const doc = await prisma.channel.update({
      where: { id },
      data: { name: data.name },
      include,
    });
    return mapChannel(doc);
  }

  async deleteById(id: string) {
    await prisma.$transaction([
      prisma.channelMessageAttachment.deleteMany({ where: { message: { channelId: id } } }),
      prisma.channelMessage.deleteMany({ where: { channelId: id } }),
      prisma.channelDisallowedRole.deleteMany({ where: { channelId: id } }),
      prisma.channel.delete({ where: { id } }),
    ]);
    return true;
  }
}

export default PrismaChannelRepository;
