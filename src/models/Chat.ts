import { model, Schema, Document, Types } from "mongoose";
import { IUser } from "./User";

export interface IChat extends Document {
  _id: Types.ObjectId;
  participants: (Types.ObjectId | IUser)[];
}

const arrayLimit = (val: String[]) => {
  return val.length === 2;
};

const chatSchema = new Schema({
  participants: {
    type: [Schema.Types.ObjectId],
    ref: "User",
    required: true,
    validate: {
      validator: arrayLimit,
      message: "A conversation must have exactly 2 participants.",
    },
  },
});

export default model("Chat", chatSchema);
