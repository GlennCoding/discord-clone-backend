import prisma from '../config/prismaClient';
import { CustomError } from '../utils/errors';

import type {
  ChannelMessageRepository,
  CreateChannelMessageData,
} from './channelMessageRepository';
import type { ChannelMessageEntity } from '../types/entities';
import type {
  Channel,
  ChannelMessage,
  ChannelMessageAttachment,
  Member,
  User,
} from '../generated/prisma/client';

type PopulatedMessage = ChannelMessage & {
  channel: Channel;
  sender: Member & { user: User };
  attachments: ChannelMessageAttachment[];
};

const mapMessage = (doc: PopulatedMessage): ChannelMessageEntity => ({
  id: doc.id,
  channelId: doc.channel.id,
  senderId: doc.sender.id,
  senderDisplayName: doc.sender.nickname ?? doc.sender.user.userName,
  senderAvatarUrl: doc.sender.user.avatarUrl ?? undefined,
  text: doc.text ?? undefined,
  attachments: doc.attachments.map((a) => ({ path: a.path, downloadUrl: a.downloadUrl })),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const include = {
  channel: true,
  sender: { include: { user: true } },
  attachments: true,
} as const;

const encodeCursor = (id: string): string => Buffer.from(id).toString('base64url');

const decodeCursor = (cursor: string): string => {
  try {
    return Buffer.from(cursor, 'base64url').toString('utf8');
  } catch {
    throw new CustomError(400, 'Invalid cursor');
  }
};

class PrismaChannelMessageRepository implements ChannelMessageRepository {
  async findById(id: string) {
    const doc = await prisma.channelMessage.findUnique({ where: { id }, include });
    return doc ? mapMessage(doc) : null;
  }

  async findRecentByChannelId(channelId: string, limit: number) {
    const docs = await prisma.channelMessage.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include,
    });
    return docs.reverse().map(mapMessage);
  }

  async findPageByChannelId(channelId: string, limit: number, beforeCursor?: string) {
    let createdAtBefore: Date | undefined;

    if (beforeCursor) {
      const cursorId = decodeCursor(beforeCursor);
      const pivot = await prisma.channelMessage.findUnique({
        where: { id: cursorId },
        select: { createdAt: true },
      });
      if (pivot) createdAtBefore = pivot.createdAt;
    }

    const docs = await prisma.channelMessage.findMany({
      where: {
        channelId,
        ...(createdAtBefore ? { createdAt: { lt: createdAtBefore } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include,
    });

    const hasMore = docs.length > limit;
    const pageDocs = hasMore ? docs.slice(0, limit) : docs;

    return { messages: pageDocs.reverse().map(mapMessage), hasMore };
  }

  async create(data: CreateChannelMessageData) {
    const doc = await prisma.channelMessage.create({
      data: { channelId: data.channelId, senderId: data.senderId, text: data.text },
      include,
    });
    return mapMessage(doc);
  }

  async deleteById(id: string) {
    await prisma.$transaction([
      prisma.channelMessageAttachment.deleteMany({ where: { messageId: id } }),
      prisma.channelMessage.delete({ where: { id } }),
    ]);
  }

  async deleteManyByChannelId(channelId: string) {
    await prisma.$transaction([
      prisma.channelMessageAttachment.deleteMany({ where: { message: { channelId } } }),
      prisma.channelMessage.deleteMany({ where: { channelId } }),
    ]);
  }
}

export { encodeCursor as encodePrismaCursor };
export default PrismaChannelMessageRepository;
