import { IAttachment, IMessage } from "../../models/Message";
import { AttachmentDTO, MessageDTO } from "../../types/dto";

const transformAttachments = (attachments: IAttachment[]): AttachmentDTO[] => {
  return attachments.map((a) => ({ downloadUrl: a.downloadUrl }));
};

export const toMessageDTO = (message: IMessage): MessageDTO => {
  return {
    id: message._id.toString(),
    chatId: message.chat.id,
    text: message.text,
    sender: {
      id: message.sender.id,
      username: message.sender.userName ?? "",
      avatarUrl: message.sender.avatar?.url,
    },
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt?.toISOString(),
    attachments: message.attachments && transformAttachments(message.attachments),
  };
};
