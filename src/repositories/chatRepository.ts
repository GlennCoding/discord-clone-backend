import type { ChatEntity } from "../types/entities";

export type ChatRepository = {
  findById(id: string): Promise<ChatEntity | null>;
}
