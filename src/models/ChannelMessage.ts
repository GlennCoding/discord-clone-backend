import { model, Schema } from "mongoose";

import type { IChannel } from "./Channel";
import type { IMember } from "./Member";
import type { Document, Types } from "mongoose";

type IAttachment = {
  path: string;
  downloadUrl: string;
} & Document

export type IChannelMessage = {
  _id: Types.ObjectId;
  channel: IChannel;
  sender: IMember;
  text: string;
  attachments?: IAttachment[];
  createdAt: Date;
  updatedAt?: Date;
} & Document

const attachmentSchema = new Schema<IAttachment>(
  {
    path: { type: String, required: true },
    downloadUrl: { type: String, required: true },
  },
  { _id: false }
);

const channelMessageSchema = new Schema<IChannelMessage>(
  {
    channel: { type: Schema.Types.ObjectId, ref: "Channel", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    text: { type: String },
    attachments: [{ type: attachmentSchema }],
  },
  { timestamps: true }
);

export default model("ChannelMessage", channelMessageSchema);
