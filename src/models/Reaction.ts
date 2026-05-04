import { model, Schema } from "mongoose";

import type { IUser } from "./User";
import type { Types, Document} from "mongoose";

export type MessageType = 'chat' | 'channel';

export interface IReaction extends Document {
  _id: Types.ObjectId;
  message: Types.ObjectId;
  messageType: MessageType;
  emoji: string;
  sender: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt?: Date;
}

const reactionSchema = new Schema<IReaction>(
  {
    message: { type: Schema.Types.ObjectId, required: true },
    messageType: { type: String, enum: ['chat', 'channel'], required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, required: true },
  },
  { timestamps: true }
);

// Supports: fetching all reactions for a message
reactionSchema.index({ message: 1 });
// Prevents duplicate reactions from the same user with the same emoji on the same message
reactionSchema.index({ message: 1, sender: 1, emoji: 1 }, { unique: true });

export default model("Reaction", reactionSchema);
