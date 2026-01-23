import { ChatMessageEntity } from "../types/entities";

export interface ChatMessageRepository {
  findById(id: string): Promise<ChatMessageEntity | null>;
  deleteById(id: string): Promise<void>;
  updateAttachments(
    id: string,
    attachments: Array<{ path: string; downloadUrl: string }>,
  ): Promise<void>;
}
