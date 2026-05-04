import { model, Schema } from "mongoose";

import type { IUser } from "./User";
import type { Document, Types } from "mongoose";

export interface IChat extends Document {
  _id: Types.ObjectId;
  participants: (Types.ObjectId | IUser)[];
  lastMessage?: {
    text?: string;
    senderName: string;
    sentAt: Date;
  };
  createdAt: Date;
  updatedAt?: Date;
}

const arrayLimit = (val: String[]) => {
  return val.length === 2;
};

const lastMessageSchema = new Schema(
  {
    text: { type: String },
    senderName: { type: String, required: true },
    sentAt: { type: Date, required: true },
  },
  { _id: false },
);

const chatSchema = new Schema<IChat>(
  {
    participants: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      required: true,
      validate: {
        validator: arrayLimit,
        message: "A conversation must have exactly 2 participants.",
      },
    },
    lastMessage: { type: lastMessageSchema, required: false },
  },
  { timestamps: true }
);

// Supports: finding chats by participant
chatSchema.index({ participants: 1 });

export default model("Chat", chatSchema);
