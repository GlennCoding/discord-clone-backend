import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { issueAuthToken } from "../services/authService";
import getEnvVar from "../utils/getEnvVar";
import { findUserWithRefreshToken } from "../services/userService";

export const handleRefreshToken = async (req: Request, res: Response) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) {
    res.status(401).json({ message: "Refresh Token required" });
    return;
  }
  const refreshToken = cookies.jwt;

  // check if refresh token in DB
  const user = await findUserWithRefreshToken(refreshToken);

  if (!user) {
    res.sendStatus(401);
    return;
  }

  const onSuccessfulVerify = () => {
    const newAccessToken = issueAuthToken(user);

    res.status(200).json({ token: newAccessToken });
  };

  jwt.verify(
    refreshToken,
    getEnvVar("REFRESH_TOKEN_SECRET"),
    (err: jwt.VerifyErrors | null, decoded: string | jwt.JwtPayload | undefined) => {
      if (err || decoded === undefined) return res.sendStatus(403);
      onSuccessfulVerify();
    }
  );
};
