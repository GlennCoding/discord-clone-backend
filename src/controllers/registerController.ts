import {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  setSsrAccessTokenCookie,
} from "../config/tokenCookies";
import { issueAuthTokens } from "../services/authService";
import { userService } from "../container";
import { CustomError, UsernameIsTakenError } from "../utils/errors";

import type { RegisterDTO } from "../types/dto";
import type { Request, Response } from "express";

export const handleRegister = async (req: Request, res: Response<RegisterDTO>) => {
  const { userName, password } = req.body;

  if (userName === undefined || password === undefined) {
    throw new CustomError(400, "Username and password are required.");
  }

  const usernameExistsAlready = await userService.findUserWithUserName(userName);
  if (usernameExistsAlready) throw new UsernameIsTakenError();

  const user = await userService.createUser(userName, password);

  const { accessToken, ssrAccessToken, refreshToken } = issueAuthTokens(user);

  await userService.saveUserRefreshToken(user.id, refreshToken);

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
