import { model, Schema, Types } from "mongoose";
import { IUser } from "./User";
import { IChat } from "./Chat";

export interface IMessage extends Document {
  _id: Types.ObjectId;
  chat: IChat;
  sender: IUser;
  createdAt: Date;
  text: string;
}

const messageSchema = new Schema<IMessage>(
  {
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export default model("Message", messageSchema);
