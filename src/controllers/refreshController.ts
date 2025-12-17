import { Request, Response } from "express";
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

export const handleRefreshToken = async (
  req: Request<RefreshInput>,
  res: Response
) => {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
  const { issueNewSsrToken } = req.body;

  if (!refreshToken) throw new RefreshtokenNotFoundError();

  const user = await findUserWithRefreshToken(refreshToken);

  if (!user) throw new CustomError(404, "Owner of this refreshtoken not found");

  const onSuccessfulVerify = async () => {
    const newAccessToken = issueAccessToken(user);
    setAccessTokenCookie(res, newAccessToken);

    const newRefreshToken = issueRefreshToken(user);
    await saveUserRefreshToken(user, refreshToken);
    setRefreshTokenCookie(res, newRefreshToken);

    if (issueNewSsrToken === true) {
      const newSsrAccessToken = issueSsrAccessToken(user);
      setSsrAccessTokenCookie(res, newSsrAccessToken);
    }

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
