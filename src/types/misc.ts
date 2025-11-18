import { IChatMessage } from "../models/ChatMessage";
import { IChannelMessage } from "../models/ChannelMessage";
import { IChannel } from "../models/Channel";
import { IMember } from "../models/Member";
import { IUser } from "../models/User";

export type PopulatedMessage = IChatMessage & {
  sender: IUser;
  chat: { _id: string | object };
};

export type PopulatedChannelMessage = IChannelMessage & {
  sender: IMember & { user: IUser };
  channel: IChannel;
};
