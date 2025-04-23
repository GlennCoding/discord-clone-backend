import { model, Schema } from "mongoose";

const userSchema = new Schema({
  user_name: { type: String, required: true },
  password: { type: String, required: true },
  status: { type: String },
});
const User = model("User", userSchema);

export { User };
