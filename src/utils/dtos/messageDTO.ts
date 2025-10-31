import { MessageDTO } from "../../types/dto";
import { PopulatedMessage } from "../../types/misc";

export const toMessageDTO = (m: PopulatedMessage): MessageDTO => ({
  id: m._id.toString(),
  chatId: m.chat._id?.toString?.() ?? m.chat.toString(),
  text: m.text,
  sender: {
    id: m.sender._id.toString(),
    username: m.sender.userName,
    avatarUrl: m.sender.avatar?.url,
  },
  createdAt: m.createdAt.toISOString(),
  updatedAt: m.updatedAt?.toISOString(),
  attachments: m.attachments?.map((a) => ({ downloadUrl: a.downloadUrl })) ?? [],
});
