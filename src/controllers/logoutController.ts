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

  return res.sendStatus(204);
};
