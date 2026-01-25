import { IChatMessage } from "../models/ChatMessage";
import { IChannelMessage } from "../models/ChannelMessage";
import { IChannel } from "../models/Channel";
import { IMember } from "../models/Member";
import { IUser } from "../models/User";

export type PopulatedChatMessage = IChatMessage & {
  sender: IUser;
};

export type PopulatedChannelMessage = IChannelMessage & {
  sender: IMember & { user: IUser };
  channel: IChannel;
};
