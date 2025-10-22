import { model, Schema, Types } from "mongoose";
import { IUser } from "./User";
import { IChat } from "./Chat";

interface IAttachment extends Document {
  path: string;
  pathUrl: string;
}

export interface IMessage extends Document {
  _id: Types.ObjectId;
  chat: IChat;
  sender: IUser;
  createdAt: Date;
  text: string;
  attachment: IAttachment[];
}

const attachmentSchema = new Schema<IAttachment>(
  {
    path: { type: String, required: true },
    pathUrl: { type: String, required: true },
  },
  { _id: false }
);

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
    attachment: [{ type: attachmentSchema, required: false }],
  },
  { timestamps: true }
);

export default model("Message", messageSchema);
