import prisma from '../config/prismaClient';

import type { ChatMessageRepository } from './chatMessageRepository';
import type { ChatMessageEntity } from '../types/entities';
import type { Chat, ChatMessage, ChatMessageAttachment, User } from '../generated/prisma/client';

type PopulatedChatMessage = ChatMessage & {
  chat: Chat;
  sender: User;
  attachments: ChatMessageAttachment[];
};

const mapMessage = (doc: PopulatedChatMessage): ChatMessageEntity => ({
  id: doc.id,
  chatId: doc.chat.id,
  sender: {
    id: doc.sender.id,
    username: doc.sender.userName,
    avatarUrl: doc.sender.avatarUrl ?? undefined,
  },
  text: doc.text ?? '',
  attachments: doc.attachments.map((a) => ({ path: a.path, downloadUrl: a.downloadUrl })),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const include = {
  chat: true,
  sender: true,
  attachments: true,
} as const;

class PrismaChatMessageRepository implements ChatMessageRepository {
  async findById(id: string) {
    const doc = await prisma.chatMessage.findUnique({ where: { id }, include });
    return doc ? mapMessage(doc) : null;
  }

  async findByChatId(chatId: string) {
    const docs = await prisma.chatMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      include,
    });
    return docs.map(mapMessage);
  }

  async deleteById(id: string) {
    await prisma.$transaction([
      prisma.reaction.deleteMany({ where: { messageId: id } }),
      prisma.chatMessageAttachment.deleteMany({ where: { messageId: id } }),
      prisma.chatMessage.delete({ where: { id } }),
    ]);
  }

  async create(newMessage: {
    chatId: string;
    senderId: string;
    text: string | undefined;
    attachments: Array<{ path: string; downloadUrl: string }>;
  }) {
    const doc = await prisma.chatMessage.create({
      data: {
        chatId: newMessage.chatId,
        senderId: newMessage.senderId,
        text: newMessage.text,
        attachments: {
          create: newMessage.attachments,
        },
      },
      include,
    });
    return mapMessage(doc);
  }

  async updateAttachments(id: string, attachments: Array<{ path: string; downloadUrl: string }>) {
    await prisma.$transaction([
      prisma.chatMessageAttachment.deleteMany({ where: { messageId: id } }),
      prisma.chatMessageAttachment.createMany({
        data: attachments.map((a) => ({ messageId: id, ...a })),
      }),
    ]);
  }
}

export default PrismaChatMessageRepository;
