import { generateCsrfToken } from "../config/csrf";
import {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  setSsrAccessTokenCookie,
} from "../config/tokenCookies";
import { userService } from "../container";
import { issueAuthTokens } from "../services/authService";
import { auditHttp } from "../utils/audit";
import { CustomError, InputMissingError } from "../utils/errors";

import type { UserRequest } from "../middleware/verifyJWT";
import type { LoginDTO } from "../types/dto";
import type { Response } from "express";

export const handleLogin = async (req: UserRequest, res: Response<LoginDTO>) => {
  const { userName, password } = req.body ?? {};

  try {
    if (!userName) throw new InputMissingError("Username");
    if (!password) throw new InputMissingError("Password");

    const user = await userService.verifyUserPassword(userName, password);
    const { accessToken, ssrAccessToken, refreshToken } = issueAuthTokens(user);

    await userService.saveUserRefreshToken(user.id, refreshToken);

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
