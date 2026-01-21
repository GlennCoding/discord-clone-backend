import { Request, Response } from "express";
import {
  REFRESH_TOKEN_COOKIE_NAME,
  clearAccessTokenCookie,
  clearRefreshTokenCookie,
  clearSsrAccessTokenCookie,
} from "../config/tokenCookies";
import {
  findUserWithRefreshToken,
  removeUserRefreshToken,
} from "../services/userService";
import { auditHttp } from "../utils/audit";

export const handleLogout = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

  clearAccessTokenCookie(res);
  clearSsrAccessTokenCookie(res);
  clearRefreshTokenCookie(res);

  if (!refreshToken) {
    return res.sendStatus(204);
  }

  const user = await findUserWithRefreshToken(refreshToken);

  if (user) {
    await removeUserRefreshToken(user, refreshToken);
  }

  auditHttp(req, "AUTH_LOGOUT");

  return res.sendStatus(204);
};
