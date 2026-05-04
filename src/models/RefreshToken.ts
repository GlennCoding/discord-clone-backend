import { model, Schema } from "mongoose";

import type { IUser } from "./User";
import type { Document, Types } from "mongoose";

export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  token: string;
  userId: Types.ObjectId | IUser;
  expiresAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>({
  token: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  expiresAt: { type: Date, required: true },
});

// TTL index — MongoDB auto-deletes documents after expiresAt
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Supports: token lookup during refresh and logout
refreshTokenSchema.index({ token: 1 }, { unique: true });
// Supports: removeAllRefreshTokens by userId
refreshTokenSchema.index({ userId: 1 });

export default model("RefreshToken", refreshTokenSchema);
