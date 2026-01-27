import { generateCsrfToken } from "../config/csrf";
import {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  setSsrAccessTokenCookie,
} from "../config/tokenCookies";
import { issueAuthTokens } from "../services/authService";
import { saveUserRefreshToken, verifyUserPassword } from "../services/userService";
import { auditHttp } from "../utils/audit";
import { CustomError, InputMissingError } from "../utils/errors";

import type { UserRequest } from "../middleware/verifyJWT";
import type { IUser } from "../models/User";
import type { LoginDTO } from "../types/dto";
import type { Response } from "express";

export const handleLogin = async (req: UserRequest, res: Response<LoginDTO>) => {
  const { userName, password } = req.body;

  try {
    if (!userName) throw new InputMissingError("Username");

    if (!password) throw new InputMissingError("Password");

    let user: IUser | undefined;
    user = await verifyUserPassword(userName, password);
    const { accessToken, ssrAccessToken, refreshToken } = await issueAuthTokens(user);

    await saveUserRefreshToken(user, refreshToken);

    setAccessTokenCookie(res, accessToken);
    setSsrAccessTokenCookie(res, ssrAccessToken);
    setRefreshTokenCookie(res, refreshToken);
    const csrfToken = generateCsrfToken(req, res);

    auditHttp(req, "AUTH_LOGIN_SUCCESS");

    return res.status(200).json({
      message: "Login successful",
      userData: {
        id: user.id,
        username: user.userName,
        avatarUrl: user.avatar?.url,
      },
      csrfToken,
    });
  } catch (err) {
    auditHttp(req, "AUTH_LOGIN_FAIL", {
      metadata: {
        userName,
        reason: err instanceof CustomError ? err.name : "unexpected_error",
      },
    });

    throw err;
  }
};
