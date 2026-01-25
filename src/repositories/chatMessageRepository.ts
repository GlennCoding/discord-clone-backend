import { ChatMessageEntity } from "../types/entities";

export interface ChatMessageRepository {
  findById(id: string): Promise<ChatMessageEntity | null>;
  deleteById(id: string): Promise<void>;
  create(newMessage: {
    chatId: string;
    senderId: string;
    text: string | undefined;
    attachments: Array<{ path: string; downloadUrl: string }>;
  }): Promise<ChatMessageEntity>;
  updateAttachments(
    id: string,
    attachments: Array<{ path: string; downloadUrl: string }>,
  ): Promise<void>;
}
