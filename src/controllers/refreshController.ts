import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { issueAccessToken, issueRefreshToken } from "../services/authService";
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
} from "../config/tokenCookies";

export const handleRefreshToken = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

  if (!refreshToken) throw new RefreshtokenNotFoundError();

  const user = await findUserWithRefreshToken(refreshToken);

  if (!user) throw new CustomError(404, "Owner of this refreshtoken not found");

  const onSuccessfulVerify = async () => {
    const newAccessToken = issueAccessToken(user);
    const newRefreshToken = issueRefreshToken(user);

    await saveUserRefreshToken(user, refreshToken);

    setAccessTokenCookie(res, newAccessToken);
    setRefreshTokenCookie(res, newRefreshToken);

    res.status(200).json({ message: "Token refreshed" });
  };

  jwt.verify(
    refreshToken,
    env.REFRESH_TOKEN_SECRET as string,
    async (
      err: jwt.VerifyErrors | null,
      decoded: string | jwt.JwtPayload | undefined
    ) => {
      if (err || decoded === undefined) {
        clearAccessTokenCookie(res);
        clearRefreshTokenCookie(res);
        await removeAllUserRefreshTokens(user);
        return res.sendStatus(403);
      }
      onSuccessfulVerify();
    }
  );
};
