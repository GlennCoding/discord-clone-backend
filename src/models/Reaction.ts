import { Types, Document, model, Schema } from "mongoose";

export interface IReaction extends Document {
  _id: Types.ObjectId;
  message: Types.ObjectId;
  emoji: string;
  sender: Types.ObjectId;
}

const reactionSchema = new Schema<IReaction>({
  message: { type: Schema.Types.ObjectId, ref: "Message", required: true },
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  emoji: { type: String, required: true },
});

export default model("User", reactionSchema);
