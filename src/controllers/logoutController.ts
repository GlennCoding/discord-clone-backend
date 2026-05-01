import {
  REFRESH_TOKEN_COOKIE_NAME,
  clearAccessTokenCookie,
  clearRefreshTokenCookie,
  clearSsrAccessTokenCookie,
} from '../config/tokenCookies';
import { userService } from '../container';
import { auditHttp } from '../utils/audit';

import type { Request, Response } from 'express';

export const handleLogout = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

  clearAccessTokenCookie(res);
  clearSsrAccessTokenCookie(res);
  clearRefreshTokenCookie(res);

  if (!refreshToken) {
    return res.sendStatus(204);
  }

  const user = await userService.findUserWithRefreshToken(refreshToken);

  if (user) {
    await userService.removeUserRefreshToken(user.id, refreshToken);
  }

  auditHttp(req, 'AUTH_LOGOUT');

  return res.sendStatus(204);
};
