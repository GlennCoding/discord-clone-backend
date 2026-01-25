
import { findUserWithUserId } from "../services/userService";
import { UserNotFoundError } from "../utils/errors";

import type { UserRequest } from "../middleware/verifyJWT";
import type { MeDTO } from "../types/dto";
import type { Response } from "express";

export const getMe = async (req: UserRequest, res: Response) => {
  const { userId } = req;
  const user = await findUserWithUserId(userId as string);
  if (!user) throw new UserNotFoundError();

  res.status(200).json({
    id: userId,
    username: user.userName,
    avatarUrl: user.avatar?.url,
  } as MeDTO);
};
