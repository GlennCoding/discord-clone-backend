import { model, Schema } from "mongoose";

import type { IChat } from "./Chat";
import type { IUser } from "./User";
import type { Types } from "mongoose";

type IAttachment = {
  path: string;
  downloadUrl: string;
} & Document

export type IChatMessage = {
  _id: Types.ObjectId;
  chat: IChat;
  sender: IUser;
  createdAt: Date;
  updatedAt?: Date;
  text: string;
  attachments?: IAttachment[];
} & Document

const attachmentSchema = new Schema<IAttachment>(
  {
    path: { type: String, required: true },
    downloadUrl: { type: String, required: true },
  },
  { _id: false }
);

const chatMessageSchema = new Schema<IChatMessage>(
  {
    chat: { type: Schema.Types.ObjectId, ref: "Chat", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: false },
    attachments: [{ type: attachmentSchema, required: false }],
  },
  { timestamps: true }
);

export default model("ChatMessage", chatMessageSchema);
