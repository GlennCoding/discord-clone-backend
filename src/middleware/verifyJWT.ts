import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../utils/env";

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

  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "Missing token" });

  const token = authHeader.split(" ")[1];

  jwt.verify(token, env.ACCESS_TOKEN_SECRET as string, (err, decoded) => {
    if (err || decoded === undefined)
      return res.status(403).json({ error: "Could not verify token" });
    const payload = decoded as AccessTokenBody;

    if (payload.UserInfo === undefined || payload.UserInfo.userId === undefined)
      return res.status(403).json({ error: "Missing user info in token" });

    req.userId = payload.UserInfo.userId;
    next();
  });
};

export default verifyJWT;
