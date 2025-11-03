import { Types } from "mongoose";
import { env } from "./env";
import { CustomError } from "./errors";

export const idsEqual = (a: any, b: any): boolean => {
  return a?.toString() === b?.toString();
};

export const isProdEnv =
  env.NODE_ENV === "production" || env.NODE_ENV === "production.local";

export const ensureValidObjectId = (value: string, field = "id") => {
  if (!Types.ObjectId.isValid(value)) {
    throw new CustomError(400, `${field} is invalid`);
  }
};
