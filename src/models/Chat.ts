import { model, Schema } from "mongoose";

import type { IUser } from "./User";
import type { Document, Types } from "mongoose";

export type IChat = {
  _id: Types.ObjectId;
  participants: (Types.ObjectId | IUser)[];
  createdAt: Date;
  updatedAt?: Date;
} & Document

const arrayLimit = (val: String[]) => {
  return val.length === 2;
};

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
  },
  { timestamps: true }
);

export default model("Chat", chatSchema);
