import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import getEnvVar from "../utils/getEnvVar";

export interface UserRequest extends Request {
  userId?: string;
}

interface AccessTokenBody extends JwtPayload {
  UserInfo?: {
    userId?: string;
  };
}

const verifyJWT = (req: UserRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) return res.sendStatus(401);

  const token = authHeader.split(" ")[1];

  jwt.verify(token, getEnvVar("ACCESS_TOKEN_SECRET"), (err, decoded) => {
    if (err || decoded === undefined) return res.sendStatus(403);
    const payload = decoded as AccessTokenBody;

    if (payload.UserInfo === undefined || payload.UserInfo.userId === undefined)
      return res.status(403).json({ message: "Missing user info in token" });

    req.userId = payload.UserInfo.userId;
    next();
  });
};

export default verifyJWT;
