import bcrypt from "bcrypt";
import User, { IUser } from "../models/User";
import { InvalidCredentialsError, UserNotFoundError } from "../utils/errors";

const SALT_ROUNDS = 10;

export const createUser = async (userName: string, password: string) => {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = new User({ userName, password: hashedPassword });
  return await user.save();
};

export const verifyUserPassword = async (
  userName: string,
  password: string
): Promise<IUser> => {
  const user: IUser | null = await User.findOne({ userName });
  if (!user) throw new UserNotFoundError(userName);

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) throw new InvalidCredentialsError();
  return user;
};

export const saveUserRefreshToken = async (
  user: IUser,
  refreshToken: string
): Promise<void> => {
  user.refreshTokens = [refreshToken];
  await user.save();
};

export const findUserWithRefreshToken = (
  refreshToken: string
): Promise<IUser | null | undefined> => {
  return User.findOne({ refreshTokens: refreshToken }).exec();
};

export const findUserWithUserName = (
  userName: string
): Promise<IUser | null | undefined> => {
  return User.findOne({ userName }).exec();
};

export const findUserWithUserId = (
  userId: string
): Promise<IUser | null | undefined> => {
  return User.findById(userId).exec();
};
