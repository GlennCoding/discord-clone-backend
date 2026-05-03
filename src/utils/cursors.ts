import { Types } from "mongoose";
import { CustomError } from "./errors";

export const encodeCursor = (id: string): string =>
  Buffer.from(id, "hex").toString("base64url");

export const decodeCursor = (cursor: string): Types.ObjectId => {
  try {
    const hex = Buffer.from(cursor, "base64url").toString("hex");
    if (!Types.ObjectId.isValid(hex)) throw new Error();
    return new Types.ObjectId(hex);
  } catch {
    throw new CustomError(400, "Invalid cursor");
  }
};
