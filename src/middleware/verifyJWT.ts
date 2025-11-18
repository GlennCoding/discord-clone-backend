import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload, TokenExpiredError, VerifyErrors } from "jsonwebtoken";
import { env } from "../utils/env";
import { ACCESS_TOKEN_COOKIE_NAME } from "../config/tokenCookies";

export interface UserRequest<T = any> extends Request {
  userId?: string;
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

  if (!token) return res.status(401).json({ error: "Missing token" });

  jwt.verify(
    token,
    env.ACCESS_TOKEN_SECRET as string,
    (err: VerifyErrors | null, decoded: string | JwtPayload | undefined) => {
      if (err instanceof TokenExpiredError)
        return res.status(401).json({ error: "Token expired" });

      if (err || decoded === undefined)
        return res.status(403).json({ error: "Could not verify token" });
      const payload = decoded as AccessTokenBody;

      if (payload.UserInfo === undefined || payload.UserInfo.userId === undefined)
        return res.status(403).json({ error: "Missing user info in token" });

      req.userId = payload.UserInfo.userId;
      next();
    }
  );
};

export default verifyJWT;
