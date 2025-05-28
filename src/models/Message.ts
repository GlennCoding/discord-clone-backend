import { model, Schema } from "mongoose";
import Conversation from "./Conversation";
import User from "./User";

const messageSchema = new Schema({
  conversation: { type: Conversation, required: true },
  sender: { type: User, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, required: true },
  editedAt: { type: Date, required: false },
});

export default model("Message", messageSchema);
