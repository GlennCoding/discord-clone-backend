import { model, Schema, Document, Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  userName: string;
  password: string;
  status?: string;
  avatar?: {
    filePath: string;
    url: string;
  };
  refreshTokens?: string[];
}

const userSchema = new Schema<IUser>({
  userName: { type: String, required: true },
  password: { type: String, required: true },
  status: { type: String },
  avatar: {
    filePath: { type: String, required: true },
    url: { type: String, required: true },
  },
  refreshTokens: { type: [String] },
});

export default model("User", userSchema);
