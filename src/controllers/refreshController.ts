import jwt from "jsonwebtoken";

import {
  clearAccessTokenCookie,
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE_NAME,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  setSsrAccessTokenCookie,
} from "../config/tokenCookies";
import {
  issueAccessToken,
  issueRefreshToken,
  issueSsrAccessToken,
} from "../services/authService";
import {
  findUserWithRefreshToken,
  removeAllUserRefreshTokens,
  removeAllUserRefreshTokensById,
  replaceUserRefreshToken,
} from "../services/userService";
import { auditHttp } from "../utils/audit";
import { env } from "../utils/env";
import { RefreshtokenNotFoundError } from "../utils/errors";

import type { UserRequest } from "../middleware/verifyJWT";
import type { RefreshInput } from "../types/dto";
import type { Response } from "express";

export const handleRefreshToken = async (
  req: UserRequest<RefreshInput>,
  res: Response,
) => {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
  const { issueNewSsrToken } = req.body;

  if (!refreshToken) {
    auditHttp(req, "AUTH_REFRESH_FAIL", {
      metadata: { reason: "missing_refresh_token" },
    });
    throw new RefreshtokenNotFoundError();
  }

  const user = await findUserWithRefreshToken(refreshToken);

  if (!user) {
    // Possible token reuse: decode userId (even if expired) and revoke
    const decoded = jwt.decode(refreshToken) as jwt.JwtPayload | null;
    const userId = decoded?.userId;

    if (userId) {
      await removeAllUserRefreshTokensById(userId as string);
    }

    auditHttp(req, "AUTH_REFRESH_FAIL", {
      metadata: { reason: "refresh_token_owner_not_found" },
    });
    return res.sendStatus(403);
  }

  try {
    jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET as string);
  } catch (err: unknown) {
    auditHttp(req, "AUTH_REFRESH_FAIL", {
      metadata: {
        reason: err instanceof Error ? err.name : "jwt_verify_failed",
      },
    });

    clearAccessTokenCookie(res);
    clearRefreshTokenCookie(res);
    await removeAllUserRefreshTokens(user);
    return res.sendStatus(403);
  }

  const newAccessToken = issueAccessToken(user);
  const newRefreshToken = issueRefreshToken(user);

  try {
    await replaceUserRefreshToken(user, refreshToken, newRefreshToken);
  } catch (err) {
    auditHttp(req, "AUTH_REFRESH_FAIL", {
      metadata: { reason: "refresh_token_rotation_failed" },
    });
    throw err;
  }

  setAccessTokenCookie(res, newAccessToken);
  setRefreshTokenCookie(res, newRefreshToken);

  if (issueNewSsrToken === true) {
    const newSsrAccessToken = issueSsrAccessToken(user);
    setSsrAccessTokenCookie(res, newSsrAccessToken);
  }

  auditHttp(req, "AUTH_REFRESH_SUCCESS");

  res.status(200).json({ message: "Token refreshed" });
};
