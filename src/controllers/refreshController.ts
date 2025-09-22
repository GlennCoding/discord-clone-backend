import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { issueAuthToken } from "../services/authService";
import { findUserWithRefreshToken } from "../services/userService";
import { env } from "../utils/env";
import { RefreshtokenNotFoundError } from "../utils/errors";

export const handleRefreshToken = async (req: Request, res: Response) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) {
    res.status(401).json({ message: "Refresh Token required" });
    return;
  }
  const refreshToken = cookies.jwt;

  const user = await findUserWithRefreshToken(refreshToken);

  if (!user) return new RefreshtokenNotFoundError();

  const onSuccessfulVerify = () => {
    const newAccessToken = issueAuthToken(user);

    res.status(200).json({ token: newAccessToken });
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
