import type { ChannelMessageDTO } from "../../types/dto";
import type { PopulatedChannelMessage } from "../../types/misc";

export const toChannelMessageDTO = (message: PopulatedChannelMessage): ChannelMessageDTO => ({
  id: message._id.toString(),
  channelId: message.channel._id.toString(),
  text: message.text,
  sender: {
    id: message.sender.user._id.toString(),
    username: message.sender.nickname ?? message.sender.user.userName,
    avatarUrl: message.sender.user.avatar?.url,
  },
  createdAt: message.createdAt.toISOString(),
  updatedAt: message.updatedAt?.toISOString(),
  attachments:
    message.attachments?.map((attachment) => ({
      downloadUrl: attachment.downloadUrl,
    })) ?? [],
});
