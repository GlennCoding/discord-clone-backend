import { model, Schema } from "mongoose";

import type { IRole } from "./Role";
import type { IServer } from "./Server";
import type { HydratedDocument, Types } from "mongoose";

// TODO: Look into if I can define the types without extending the Document
export interface IChannel extends Document {
  _id: Types.ObjectId;
  server: IServer;
  name: string;
  order: number;
  allowedRoles: IRole[];
  createdAt: Date;
  updatedAt?: Date;
}

export type ChannelDocument = HydratedDocument<IChannel>;

const channelSchema = new Schema<IChannel>(
  {
    server: { type: Schema.Types.ObjectId, ref: "Server", required: true },
    name: { type: String, required: true },
    order: { type: Number, required: true },
    allowedRoles: [{ type: Schema.Types.ObjectId, ref: "Role" }],
  },
  {
    timestamps: true,
  },
);

channelSchema.index({ server: 1, order: 1 });

export default model("Channel", channelSchema);
