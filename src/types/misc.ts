import type { IChannel } from "../models/Channel";
import type { IChannelMessage } from "../models/ChannelMessage";
import type { IChatMessage } from "../models/ChatMessage";
import type { IMember } from "../models/Member";
import type { IUser } from "../models/User";

export type PopulatedChatMessage = IChatMessage & {
  sender: IUser;
};

export type PopulatedChannelMessage = IChannelMessage & {
  sender: IMember & { user: IUser };
  channel: IChannel;
};
