import type { ChatEntity } from '../types/entities';

export interface ChatRepository {
  findById(id: string): Promise<ChatEntity | null>;
  findByParticipantId(userId: string): Promise<ChatEntity[]>;
  findBetweenUsers(user1Id: string, user2Id: string): Promise<ChatEntity | null>;
  create(user1Id: string, user2Id: string): Promise<ChatEntity>;
  deleteWithMessages(chatId: string): Promise<void>;
}
