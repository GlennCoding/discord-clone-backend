import { model, Schema } from "mongoose";

import type { IRole } from "./Role";
import type { IServer } from "./Server";
import type { IUser } from "./User";
import type { HydratedDocument} from "mongoose";

export interface IMember {
  user: IUser;
  nickname?: string;
  server: IServer;
  roles: IRole[];
  joinedDate?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export type MemberDocument = HydratedDocument<IMember>;

const memberSchema = new Schema<IMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    nickname: { type: String },
    server: { type: Schema.Types.ObjectId, ref: "Server", required: true },
    roles: [{ type: Schema.Types.ObjectId, ref: "Role" }],
    joinedDate: { type: Date, default: Date.now() },
  },
  {
    timestamps: true,
  }
);

export default model("Member", memberSchema);
