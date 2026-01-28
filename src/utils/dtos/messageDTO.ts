import type { MessageDTO } from "../../types/dto";
import type { ChatMessageEntity } from "../../types/entities";
import type { FileStorage } from "../../infrastructure/FileStorage";

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

export const toMessageDTOWithSignedUrls = async (
  message: ChatMessageEntity,
  fileStorage: FileStorage,
): Promise<MessageDTO> => {
  const { id, chatId, sender, text, attachments, createdAt, updatedAt } = message;

  const signedAttachments =
    attachments && attachments.length > 0
      ? await Promise.all(
          attachments.map(async (a) => ({
            downloadUrl: await fileStorage.getDownloadUrl(a.path),
          })),
        )
      : [];

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
    attachments: signedAttachments,
  };
};
