import { model, Schema, Types } from "mongoose";
import { IUser } from "./User";
import { IChat } from "./Chat";

export interface IAttachment extends Document {
  path: string;
  downloadUrl: string;
}

export interface IChatMessage extends Document {
  _id: Types.ObjectId;
  chat: IChat;
  sender: IUser;
  createdAt: Date;
  updatedAt?: Date;
  text: string;
  attachments?: IAttachment[];
}

const attachmentSchema = new Schema<IAttachment>(
  {
    path: { type: String, required: true },
    downloadUrl: { type: String, required: true },
  },
  { _id: false }
);

const chatMessageSchema = new Schema<IChatMessage>(
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
      required: false,
    },
    attachments: [{ type: attachmentSchema, required: false }],
  },
  { timestamps: true }
);

export default model("ChatMessage", chatMessageSchema);
