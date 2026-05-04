import { model, Schema } from "mongoose";

import type { IUser } from "./User";
import type { Document, Types } from "mongoose";

export interface IServer extends Document {
  _id: Types.ObjectId;
  name: string;
  shortId: string;
  iconUrl?: string;
  owner: IUser;
  description?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

const serverSchema = new Schema<IServer>(
  {
    name: { type: String, required: true },
    shortId: { type: String, required: true },
    iconUrl: { type: String },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    description: { type: String },
    isPublic: { type: Boolean, required: true },
  },
  {
    timestamps: true,
  },
);

serverSchema.index({ shortId: 1 }, { unique: true });
serverSchema.index({ owner: 1 });
serverSchema.index({ isPublic: 1, name: 1 });

export default model("Server", serverSchema);
