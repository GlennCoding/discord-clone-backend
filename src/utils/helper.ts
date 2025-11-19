import { Types } from "mongoose";
import { env } from "./env";
import { CustomError, ParamsMissingError, UserNotFoundError } from "./errors";
import { findUserWithUserId } from "../services/userService";

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

export const ensureUser = async (userId: string | undefined) => {
  if (!userId) throw new CustomError(500, "userId missing");
  const user = await findUserWithUserId(userId);
  if (!user) throw new UserNotFoundError();
  return user;
};

export const ensureParam = (
  paramName: string,
  param: string | undefined,
  options?: { isObjectId?: boolean }
): string => {
  if (!param) throw new ParamsMissingError(paramName);
  const trimmed = param.trim();
  if (options?.isObjectId) ensureValidObjectId(trimmed, paramName);
  return trimmed;
};
