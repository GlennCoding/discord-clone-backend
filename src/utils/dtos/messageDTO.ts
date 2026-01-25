import { MessageDTO } from "../../types/dto";
import { ChatMessageEntity } from "../../types/entities";

export const toMessageDTO = (message: ChatMessageEntity): MessageDTO => {
  const { id, chatId, sender, text, attachments, createdAt, updatedAt } = message;
  return {
    id,
    chatId,
    text,
    sender: {
      id: sender.id,
      username: sender.username,
      avatarUrl: sender.avatarUrl,
    },
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt?.toISOString(),
    attachments: attachments?.map((a) => ({ downloadUrl: a.downloadUrl })) ?? [],
  };
};
