import prisma from '../config/prismaClient';

import type { ChatRepository } from './chatRepository';
import type { ChatEntity } from '../types/entities';
import type { Chat } from '../generated/prisma/client';

const mapChat = (doc: Chat): ChatEntity => ({
  id: doc.id,
  participantIds: [doc.user1Id, doc.user2Id],
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

class PrismaChatRepository implements ChatRepository {
  async findById(id: string) {
    const doc = await prisma.chat.findUnique({ where: { id } });
    return doc ? mapChat(doc) : null;
  }

  async findByParticipantId(userId: string) {
    const docs = await prisma.chat.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    });
    return docs.map(mapChat);
  }

  async findBetweenUsers(user1Id: string, user2Id: string) {
    const doc = await prisma.chat.findFirst({
      where: {
        OR: [
          { user1Id, user2Id },
          { user1Id: user2Id, user2Id: user1Id },
        ],
      },
    });
    return doc ? mapChat(doc) : null;
  }

  async create(user1Id: string, user2Id: string) {
    const doc = await prisma.chat.create({ data: { user1Id, user2Id } });
    return mapChat(doc);
  }

  async deleteWithMessages(chatId: string) {
    await prisma.$transaction([
      prisma.reaction.deleteMany({ where: { message: { chatId } } }),
      prisma.chatMessageAttachment.deleteMany({ where: { message: { chatId } } }),
      prisma.chatMessage.deleteMany({ where: { chatId } }),
      prisma.chat.delete({ where: { id: chatId } }),
    ]);
  }
}

export default PrismaChatRepository;
