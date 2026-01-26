import jwt from "jsonwebtoken";

import { SSR_ACCESS_TOKEN_COOKIE_NAME } from "../config/tokenCookies";
import { env } from "../utils/env";

import type { UserRequest } from "./verifyJWT";
import type { Response, NextFunction } from "express";
import type { JwtPayload, VerifyErrors } from "jsonwebtoken";

type AccessTokenBody = {
  UserInfo?: {
    userId?: string;
  };
} & JwtPayload

const verifySsrJwt = (req: UserRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const tokenFromHeader =
    authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : undefined;
  const token = req.cookies?.[SSR_ACCESS_TOKEN_COOKIE_NAME] ?? tokenFromHeader;

  if (!token) return res.status(401).json({ error: "Missing token" });

  jwt.verify(
    token,
    env.SSR_ACCESS_TOKEN_SECRET,
    (err: VerifyErrors | null, decoded: string | JwtPayload | undefined) => {
      if (err && err instanceof jwt.TokenExpiredError)
        return res.status(401).json({ error: "Token expired" });

      if (err) return res.status(403).json({ error: "Invalid token" });

      if (decoded === undefined)
        return res.status(403).json({ error: "Could not verify token" });

      const payload = decoded as AccessTokenBody;

      if (payload.UserInfo?.userId === undefined)
        return res.status(403).json({ error: "Missing user info in token" });

      req.userId = payload.UserInfo.userId;
      next();
    }
  );
};

export default verifySsrJwt;
