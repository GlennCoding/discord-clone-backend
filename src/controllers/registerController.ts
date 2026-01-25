
import {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  setSsrAccessTokenCookie,
} from "../config/tokenCookies";
import {
  issueAccessToken,
  issueAuthTokens,
  issueRefreshToken,
  issueSsrAccessToken,
} from "../services/authService";
import {
  createUser,
  findUserWithUserName,
  saveUserRefreshToken,
} from "../services/userService";
import { CustomError, UsernameIsTakenError } from "../utils/errors";

import type { RegisterDTO } from "../types/dto";
import type { Request, Response } from "express";

export const handleRegister = async (req: Request, res: Response<RegisterDTO>) => {
  const { userName, password } = req.body;

  if (userName === undefined || password === undefined) {
    throw new CustomError(400, "Username and password are required.");
  }

  const usernameExistsAlready = await findUserWithUserName(userName);

  if (usernameExistsAlready) throw new UsernameIsTakenError();

  const user = await createUser(userName, password);

  const { accessToken, ssrAccessToken, refreshToken } = await issueAuthTokens(user);

  await saveUserRefreshToken(user, refreshToken);

  setAccessTokenCookie(res, accessToken);
  setSsrAccessTokenCookie(res, ssrAccessToken);
  setRefreshTokenCookie(res, refreshToken);

  return res.status(201).json({
    message: "Registered successfully",
    userData: {
      id: user.id,
      username: user.userName,
      avatarUrl: user.avatar?.url,
    },
  });
};
