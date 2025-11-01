import { IChatMessage } from "../models/ChatMessage";
import { IUser } from "../models/User";

export type PopulatedMessage = IChatMessage & {
  sender: IUser;
  chat: { _id: string | object };
};
