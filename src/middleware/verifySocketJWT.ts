import { ExtendedError, Socket } from "socket.io";
import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";
import getEnvVar from "../utils/getEnvVar";

const verifySocketJWT = (socket: Socket, next: (err?: ExtendedError) => void) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("NO_TOKEN"));
  }

  jwt.verify(
    token,
    getEnvVar("ACCESS_TOKEN_SECRET"),
    (err: VerifyErrors | null, decoded: string | JwtPayload | undefined) => {
      if (err && err.name === "TokenExpiredError")
        return next(new Error("EXPIRED_TOKEN"));

      if (err || decoded === undefined) return next(new Error("INVALID_TOKEN"));

      const payload = decoded as JwtPayload;

      if (!payload.UserInfo?.userId) return next(new Error("USER_INFO_MISSING"));

      socket.data.user = payload.UserInfo.userId;
      next();
    }
  );
};

export default verifySocketJWT;
