import { model, Schema } from "mongoose";

import type { IRole } from "./Role";
import type { IServer } from "./Server";
import type { HydratedDocument, Types } from "mongoose";

// TODO: Look into if I can define the types without extending the Document
export type IChannel = {
  _id: Types.ObjectId;
  server: IServer;
  name: string;
  order: number;
  disallowedRoles: IRole[];
  createdAt: Date;
  updatedAt?: Date;
} & Document

export type ChannelDocument = HydratedDocument<IChannel>;

const channelSchema = new Schema<IChannel>(
  {
    server: { type: Schema.Types.ObjectId, ref: "Server", required: true },
    name: { type: String, required: true },
    order: { type: Number, required: true },
    disallowedRoles: [{ type: Schema.Types.ObjectId, ref: "Role" }],
  },
  {
    timestamps: true,
  }
);

export default model("Channel", channelSchema);
