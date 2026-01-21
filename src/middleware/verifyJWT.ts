import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";
import { env } from "../utils/env";
import { ACCESS_TOKEN_COOKIE_NAME } from "../config/tokenCookies";
import { auditHttp } from "../utils/audit";
import {
  CouldNotVerifyToken,
  InvalidToken,
  MissingUserInfoInToken,
  TokenExpiredError,
  TokenMissingError,
} from "../utils/errors";

export interface UserRequest<T = any> extends Request {
  userId?: string;
  requestId?: string;
  body: Partial<T>;
}

interface AccessTokenBody extends JwtPayload {
  UserInfo?: {
    userId?: string;
  };
}

const verifyJWT = (req: UserRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const tokenFromHeader =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : undefined;
  const token = req.cookies?.[ACCESS_TOKEN_COOKIE_NAME] ?? tokenFromHeader;

  if (!token) {
    auditHttp(req, "TOKEN_MISSING");
    return next(new TokenMissingError());
  }

  jwt.verify(
    token,
    env.ACCESS_TOKEN_SECRET as string,
    (err: VerifyErrors | null, decoded: string | JwtPayload | undefined) => {
      if (err instanceof jwt.TokenExpiredError) {
        auditHttp(req, "INVALID_TOKEN_USED", { metadata: { reason: err.name } });
        return next(new TokenExpiredError());
      } else if (err) {
        auditHttp(req, "INVALID_TOKEN_USED", { metadata: { reason: err.name } });
        return next(new InvalidToken());
      } else if (decoded === undefined) {
        auditHttp(req, "INVALID_TOKEN_USED", {
          metadata: { reason: "Could not verify token" },
        });
        return next(new CouldNotVerifyToken());
      }

      const payload = decoded as AccessTokenBody;

      if (payload.UserInfo?.userId === undefined) {
        return next(new MissingUserInfoInToken());
      }

      req.userId = payload.UserInfo.userId;
      next();
    },
  );
};

export default verifyJWT;
