import { model, Schema } from "mongoose";
import User from "./User";

const conversationSchema = new Schema({
  particpants: { type: [User], required: true },
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
});

export default model("Conversation", conversationSchema);
