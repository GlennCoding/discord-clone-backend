import type { ChatEntity } from "../types/entities";

export interface ChatRepository {
  findById(id: string): Promise<ChatEntity | null>;
}
