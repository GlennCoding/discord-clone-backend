import { model, Schema, Document, Types } from "mongoose";
import { IServer } from "./Server";

enum Permissions {
  ChannelAdmin = "CHANNEL_ADMIN",
  RoleAdmin = "ROLE_ADMIN",
  ServerAdmin = "SERVER_ADMIN",
}

export interface IRole extends Document {
  _id: Types.ObjectId;
  server: IServer;
  name: string;
  permissions: Permissions[];
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
