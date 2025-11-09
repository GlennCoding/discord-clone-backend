import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { issueAuthToken } from "../services/authService";
import { findUserWithRefreshToken } from "../services/userService";
import { env } from "../utils/env";
import { RefreshtokenNotFoundError } from "../utils/errors";
import {
  REFRESH_TOKEN_COOKIE_NAME,
  setAccessTokenCookie,
} from "../config/tokenCookies";

export const handleRefreshToken = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

  if (!refreshToken) {
    res.status(401).json({ message: "Refresh token required" });
    return;
  }

  const user = await findUserWithRefreshToken(refreshToken);

  if (!user) throw new RefreshtokenNotFoundError();

  const onSuccessfulVerify = () => {
    const newAccessToken = issueAuthToken(user);

    setAccessTokenCookie(res, newAccessToken);

    res.status(200).json({ message: "Token refreshed" });
  };

  jwt.verify(
    refreshToken,
    env.REFRESH_TOKEN_SECRET as string,
    (err: jwt.VerifyErrors | null, decoded: string | jwt.JwtPayload | undefined) => {
      if (err || decoded === undefined) return res.sendStatus(403);
      onSuccessfulVerify();
    }
  );
};
