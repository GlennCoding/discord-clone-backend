import { model, Schema, HydratedDocument } from "mongoose";
import { IRole } from "./Role";
import { IServer } from "./Server";

// TODO: Look into if I can define the types without extending the Document
export interface IChannel {
  server: IServer;
  name: string;
  order: number;
  disallowedRoles: IRole[];
  createdAt: Date;
  updatedAt?: Date;
}

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
