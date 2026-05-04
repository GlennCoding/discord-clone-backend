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
  createdAt: Date;
  updatedAt?: Date;
}

const avatarSchema = new Schema(
  {
    filePath: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    userName: { type: String, required: true },
    password: { type: String, required: true },
    status: { type: String },
    avatar: { type: avatarSchema, required: false },
    refreshTokens: { type: [String] },
  },
  { timestamps: true },
);

// Supports: login and authentication lookups
userSchema.index({ userName: 1 }, { unique: true });
// Supports: refresh token validation
userSchema.index({ refreshTokens: 1 }, { sparse: true });

export default model("User", userSchema);
