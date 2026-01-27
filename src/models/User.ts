import { model, Schema } from "mongoose";

import type { Document, Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  userName: string;
  password: string;
  status?: string;
  avatar?: {
    filePath: string;
    url: string;
  };
  refreshTokens?: string[];
}

const avatarSchema = new Schema(
  {
    filePath: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>({
  userName: { type: String, required: true },
  password: { type: String, required: true },
  status: { type: String },
  avatar: { type: avatarSchema, required: false },
  refreshTokens: { type: [String] },
});

export default model("User", userSchema);
