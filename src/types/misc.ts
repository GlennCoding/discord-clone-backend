import { IMessage } from "../models/Message";
import { IUser } from "../models/User";

export type PopulatedMessage = IMessage & {
  sender: IUser;
  chat: { _id: string | object };
};
