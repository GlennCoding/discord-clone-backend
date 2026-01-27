import jwt from "jsonwebtoken";

import { ACCESS_TOKEN_COOKIE_NAME } from "../config/tokenCookies";
import { env } from "../utils/env";

import type { JwtPayload, VerifyErrors } from "jsonwebtoken";
import type { ExtendedError, Socket } from "socket.io";

const getCookieValue = (cookieHeader: string | undefined, name: string) => {
  if (!cookieHeader) return undefined;

  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .map((cookie) => {
      const [cookieName, ...valueParts] = cookie.split("=");
      return [cookieName, valueParts.join("=")];
    })
    .find(([cookieName]) => cookieName === name)?.[1];
};

const verifySocketJWT = (socket: Socket, next: (err?: ExtendedError) => void) => {
  const cookieHeader = socket.handshake.headers.cookie;
  const token = getCookieValue(cookieHeader, ACCESS_TOKEN_COOKIE_NAME);

  if (!token) {
    return next(new Error("NO_TOKEN"));
  }

  jwt.verify(
    token,
    env.ACCESS_TOKEN_SECRET as string,
    (err: VerifyErrors | null, decoded: string | JwtPayload | undefined) => {
      if (err && err instanceof jwt.TokenExpiredError) return next(new Error("EXPIRED_TOKEN"));

      if (err || decoded === undefined) return next(new Error("INVALID_TOKEN"));

      const payload = decoded as JwtPayload;

      if (!payload.UserInfo?.userId) return next(new Error("USER_INFO_MISSING"));

      socket.data.userId = payload.UserInfo.userId;
      next();
    },
  );
};

export default verifySocketJWT;
