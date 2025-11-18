import { ChannelMessageDTO } from "../../types/dto";
import { PopulatedChannelMessage } from "../../types/misc";

export const toChannelMessageDTO = (
  message: PopulatedChannelMessage
): ChannelMessageDTO => ({
  id: message._id.toString(),
  channelId: message.channel._id?.toString?.() ?? message.channel.toString(),
  text: message.text ?? "",
  sender: {
    id: message.sender.user._id?.toString?.() ?? message.sender.user.toString(),
    username: message.sender.nickname || message.sender.user.userName,
    avatarUrl: message.sender.user.avatar?.url,
  },
  createdAt: message.createdAt.toISOString(),
  updatedAt: message.updatedAt?.toISOString(),
  attachments:
    message.attachments?.map((attachment) => ({
      downloadUrl: attachment.downloadUrl,
    })) ?? [],
});
