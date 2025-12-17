import { Request, Response } from "express";
import { saveUserRefreshToken, verifyUserPassword } from "../services/userService";
import {
  issueAccessToken,
  issueRefreshToken,
  issueSsrAccessToken,
} from "../services/authService";
import { InputMissingError, RequestBodyIsMissingError } from "../utils/errors";
import { LoginDTO } from "../types/dto";
import {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  setSsrAccessTokenCookie,
} from "../config/tokenCookies";

export const handleLogin = async (req: Request, res: Response<LoginDTO>) => {
  if (!req.body) throw new RequestBodyIsMissingError();

  const { userName, password } = req.body;

  if (!userName) throw new InputMissingError("Username");

  if (!password) throw new InputMissingError("Password");

  const user = await verifyUserPassword(userName, password);

  const accessToken = issueAccessToken(user);
  const ssrAccessToken = issueSsrAccessToken(user);
  const refreshToken = issueRefreshToken(user);

  await saveUserRefreshToken(user, refreshToken);

  setAccessTokenCookie(res, accessToken);
  setSsrAccessTokenCookie(res, ssrAccessToken);
  setRefreshTokenCookie(res, refreshToken);

  return res.status(200).json({
    message: "Login successful",
    userData: {
      id: user.id,
      username: user.userName,
      avatarUrl: user.avatar?.url,
    },
  });
};
