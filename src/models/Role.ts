import { model, Schema } from "mongoose";

import type { IServer } from "./Server";
import type { Document, Types } from "mongoose";

export enum RolePermission {
  ChannelAdmin = "CHANNEL_ADMIN",
  RoleAdmin = "ROLE_ADMIN",
  ServerAdmin = "SERVER_ADMIN",
}

export interface IRole extends Document {
  _id: Types.ObjectId;
  server: IServer;
  name: string;
  permissions: RolePermission[];
  createdAt: Date;
  updatedAt?: Date;
}

const roleSchema = new Schema<IRole>(
  {
    server: { type: Schema.Types.ObjectId, ref: "Server" },
    name: { type: String, required: true },
    permissions: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

export default model("Role", roleSchema);
