import { HydratedDocument, model, Schema } from "mongoose";
import { IUser } from "./User";
import { IRole } from "./Role";
import { IServer } from "./Server";

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
