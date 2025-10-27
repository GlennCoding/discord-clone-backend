import { Response } from "express";
import { UserRequest } from "../middleware/verifyJWT";
import { findUserWithUserId } from "../services/userService";
import { UserNotFoundError } from "../utils/errors";

export const getMe = async (req: UserRequest, res: Response) => {
  const { userId } = req;
  const user = await findUserWithUserId(userId as string);
  if (!user) throw new UserNotFoundError();

  res
    .status(200)
    .json({ userId: userId, username: user.userName, avatarUrl: user.avatar?.url });
};
