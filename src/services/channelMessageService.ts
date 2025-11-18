import Channel, { ChannelDocument } from "../models/Channel";
import ChannelMessage from "../models/ChannelMessage";
import Member, { MemberDocument } from "../models/Member";
import { ChannelMessageDTO, ChannelSubscribeDTO } from "../types/dto";
import { PopulatedChannelMessage } from "../types/misc";
import { CustomError, NotFoundError } from "../utils/errors";
import { ensureParam, ensureUser } from "../utils/helper";
import { toChannelDTO } from "./serverService";
import { toChannelMessageDTO } from "../utils/dtos/channelMessageDTO";

const CHANNEL_MESSAGE_HISTORY_LIMIT = 50;

const channelMessagePopulateOptions = [
  {
    path: "sender",
    populate: {
      path: "user",
      select: "userName avatar",
    },
  },
  {
    path: "channel",
    select: "_id",
  },
];

type PopulatedMember = MemberDocument & {
  user: MemberDocument["user"];
};

export const ensureChannelAccess = async (
  channelIdParam: string,
  userId: string
): Promise<{
  channel: ChannelDocument;
  member: PopulatedMember;
}> => {
  const channelId = ensureParam("channelId", channelIdParam, { isObjectId: true });
  const user = await ensureUser(userId);

  const channel = await Channel.findById(channelId)
    .populate("server")
    .populate("disallowedRoles", "_id")
    .exec();

  if (!channel) throw new NotFoundError("Channel");

  const member = await Member.findOne({ server: channel.server, user })
    .populate("roles", "_id name")
    .populate("user")
    .exec();

  if (!member) throw new CustomError(403, "You are no member of this server");

  const disallowedRoles = channel.disallowedRoles ?? [];
  const memberRoles = member.roles ?? [];

  const hasRestrictedRole = disallowedRoles.some((role) =>
    memberRoles.some((memberRole) => memberRole.id === role.id)
  );

  if (hasRestrictedRole) {
    throw new CustomError(403, "You cannot access this channel");
  }

  return { channel, member: member as PopulatedMember };
};

export const fetchRecentChannelMessages = async (
  channelId: string
): Promise<ChannelMessageDTO[]> => {
  const messages = (await ChannelMessage.find({ channel: channelId })
    .sort({ createdAt: -1 })
    .limit(CHANNEL_MESSAGE_HISTORY_LIMIT)
    .populate(channelMessagePopulateOptions)) as PopulatedChannelMessage[];

  return messages.reverse().map((message) => toChannelMessageDTO(message));
};

export const createChannelMessage = async (
  channelId: string,
  member: MemberDocument,
  text: string
): Promise<ChannelMessageDTO> => {
  const created = await ChannelMessage.create({
    channel: channelId,
    sender: member._id,
    text,
  });

  const populated = (await created.populate(
    channelMessagePopulateOptions
  )) as PopulatedChannelMessage;

  return toChannelMessageDTO(populated);
};

export const buildChannelSubscribePayload = (
  channel: ChannelDocument,
  messages: ChannelMessageDTO[]
): ChannelSubscribeDTO => ({
  serverId:
    typeof channel.server === "object" && "id" in channel.server
      ? (channel.server as { id: string }).id
      : channel.server.toString(),
  channel: toChannelDTO(channel),
  messages,
});
