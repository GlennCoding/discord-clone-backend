import { idsEqual } from '../utils/helper';

import type { ChatRepository } from '../repositories/chatRepository';
import type { UserRepository } from '../repositories/userRepository';
import type { ChatDTO } from '../types/dto';
import type { ChatEntity } from '../types/entities';

export class ChatService {
  constructor(
    private chat: ChatRepository,
    private user: UserRepository,
  ) {}

  getUserChats(userId: string): Promise<ChatEntity[]> {
    return this.chat.findByParticipantId(userId);
  }

  async formatUserChats(chats: ChatEntity[], userId: string): Promise<ChatDTO[]> {
    const otherIds = chats.map((chat) => {
      const otherId = chat.participantIds.find((id) => !idsEqual(id, userId));
      if (!otherId) throw new Error(`Chat ${chat.id} doesn't contain other participants`);
      return otherId;
    });

    const users = await this.user.findManyByIds(otherIds);
    const userMap = new Map(users.map((u) => [u.id, u]));

    return chats.map((chat, i) => {
      const other = userMap.get(otherIds[i]);
      if (!other) throw new Error(`Participant ${otherIds[i]} not found`);

      return {
        chatId: chat.id,
        participant: other.userName,
        participantAvatarUrl: other.avatar?.url,
        lastMessage: chat.lastMessage
          ? {
              text: chat.lastMessage.text,
              senderName: chat.lastMessage.senderName,
              sentAt: chat.lastMessage.sentAt.toISOString(),
            }
          : undefined,
      } satisfies ChatDTO;
    });
  }

  findChatBetweenTwoUsers(user1Id: string, user2Id: string): Promise<ChatEntity | null> {
    return this.chat.findBetweenUsers(user1Id, user2Id);
  }

  findChatWithChatId(chatId: string): Promise<ChatEntity | null> {
    return this.chat.findById(chatId);
  }

  createChat(user1Id: string, user2Id: string): Promise<ChatEntity> {
    return this.chat.create(user1Id, user2Id);
  }

  checkIfUserIdPartOfChat(chat: ChatEntity, userId: string): boolean {
    return chat.participantIds.some((id) => idsEqual(id, userId));
  }

  deleteChat(chatId: string): Promise<void> {
    return this.chat.deleteWithMessages(chatId);
  }

  findParticipant(userId: string) {
    return this.user.findById(userId);
  }
}
