import crypto from "crypto";

import bcrypt from "bcrypt";

import User from "../models/User";
import { InvalidCredentialsError, UserNotFoundError } from "../utils/errors";

import type { IUser } from "../models/User";

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_LIMIT = 5;

const hashRefreshToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

export const createUser = async (userName: string, password: string) => {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = new User({ userName, password: hashedPassword });
  return await user.save();
};

export const verifyUserPassword = async (userName: string, password: string): Promise<IUser> => {
  const user: IUser | null = await User.findOne({ userName });
  if (!user) throw new UserNotFoundError(userName);

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) throw new InvalidCredentialsError();
  return user;
};

export const saveUserRefreshToken = async (user: IUser, refreshToken: string): Promise<void> => {
  const hashedToken = hashRefreshToken(refreshToken);
  const tokens = user.refreshTokens ?? [];

  if (!tokens.includes(hashedToken)) {
    tokens.push(hashedToken);
  }

  user.refreshTokens = tokens.slice(-REFRESH_TOKEN_LIMIT);
  await user.save();
};

export const removeAllUserRefreshTokens = async (user: IUser): Promise<void> => {
  user.refreshTokens = [];
  await user.save();
};

export const findUserWithRefreshToken = (
  refreshToken: string,
): Promise<IUser | null | undefined> => {
  const hashedToken = hashRefreshToken(refreshToken);

  return User.findOne({ refreshTokens: { $in: [hashedToken, refreshToken] } }).exec();
};

export const findUserWithUserName = (userName: string): Promise<IUser | null | undefined> => {
  return User.findOne({ userName }).exec();
};

export const findUserWithUserId = (userId: string): Promise<IUser | null | undefined> => {
  return User.findById(userId).exec();
};

export const removeUserRefreshToken = async (user: IUser, refreshToken: string): Promise<void> => {
  const hashedToken = hashRefreshToken(refreshToken);
  user.refreshTokens = (user.refreshTokens ?? []).filter(
    (token) => token !== hashedToken && token !== refreshToken,
  );
  await user.save();
};

export const replaceUserRefreshToken = async (
  user: IUser,
  oldToken: string,
  newToken: string,
): Promise<void> => {
  const oldHashedToken = hashRefreshToken(oldToken);
  const newHashedToken = hashRefreshToken(newToken);

  const tokens = (user.refreshTokens ?? []).filter(
    (token) => token !== oldHashedToken && token !== oldToken,
  );

  tokens.push(newHashedToken);
  user.refreshTokens = tokens.slice(-REFRESH_TOKEN_LIMIT);
  await user.save();
};

export const removeAllUserRefreshTokensById = async (userId: string): Promise<void> => {
  const user = await findUserWithUserId(userId);
  if (!user) return;
  user.refreshTokens = [];
  await user.save();
};
