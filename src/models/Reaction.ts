import { Types, Document, model, Schema } from "mongoose";
import { IUser } from "./User";
import { IChatMessage } from "./ChatMessage";

export interface IReaction extends Document {
  _id: Types.ObjectId;
  message: Types.ObjectId | IChatMessage;
  emoji: string;
  sender: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt?: Date;
}

const reactionSchema = new Schema<IReaction>(
  {
    message: { type: Schema.Types.ObjectId, ref: "ChatMessage", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, required: true },
  },
  { timestamps: true }
);

export default model("Reaction", reactionSchema);
