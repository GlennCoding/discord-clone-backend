import { Response } from "express";
import jwt from "jsonwebtoken";
import {
  issueAccessToken,
  issueRefreshToken,
  issueSsrAccessToken,
} from "../services/authService";
import {
  findUserWithRefreshToken,
  removeAllUserRefreshTokens,
  saveUserRefreshToken,
} from "../services/userService";
import { env } from "../utils/env";
import { CustomError, RefreshtokenNotFoundError } from "../utils/errors";
import {
  clearAccessTokenCookie,
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE_NAME,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  setSsrAccessTokenCookie,
} from "../config/tokenCookies";
import { RefreshInput } from "../types/dto";
import { auditHttp } from "../utils/audit";
import { UserRequest } from "../middleware/verifyJWT";

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
    auditHttp(req, "AUTH_REFRESH_FAIL", {
      metadata: { reason: "refresh_token_owner_not_found" },
    });
    throw new CustomError(404, "Owner of this refreshtoken not found");
  }

  jwt.verify(
    refreshToken,
    env.REFRESH_TOKEN_SECRET as string,
    async (
      err: jwt.VerifyErrors | null,
      decoded: string | jwt.JwtPayload | undefined,
    ) => {
      if (err || decoded === undefined) {
        auditHttp(req, "AUTH_REFRESH_FAIL", {
          metadata: {
            reason: err ? err.name : "jwt_verify_failed",
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
        await saveUserRefreshToken(user, newRefreshToken);
      } catch (err) {
        auditHttp(req, "AUTH_REFRESH_FAIL", {
          metadata: { reason: "jwt_verify_failed" },
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
    },
  );
};
