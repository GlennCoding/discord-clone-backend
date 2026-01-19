import { Response } from "express";
import { saveUserRefreshToken, verifyUserPassword } from "../services/userService";
import { issueAuthTokens } from "../services/authService";
import {
  InputMissingError,
  InvalidCredentialsError,
  RequestBodyIsMissingError,
  UserNotFoundError,
} from "../utils/errors";
import { LoginDTO } from "../types/dto";
import {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  setSsrAccessTokenCookie,
} from "../config/tokenCookies";
import { audit } from "../utils/audit";
import { UserRequest } from "../middleware/verifyJWT";
import { IUser } from "../models/User";

export const handleLogin = async (req: UserRequest, res: Response<LoginDTO>) => {
  if (!req.body) throw new RequestBodyIsMissingError();

  const { userName, password } = req.body;

  if (!userName) throw new InputMissingError("Username");

  if (!password) throw new InputMissingError("Password");

  let user: IUser | undefined;
  try {
    user = await verifyUserPassword(userName, password);
    const { accessToken, ssrAccessToken, refreshToken } =
      await issueAuthTokens(user);

    await saveUserRefreshToken(user, refreshToken);

    setAccessTokenCookie(res, accessToken);
    setSsrAccessTokenCookie(res, ssrAccessToken);
    setRefreshTokenCookie(res, refreshToken);

    audit({
      action: "AUTH_LOGIN_SUCCESS",
      actorUserId: user.id,
      ip: req.ip,
      requestId: req.requestId,
    });
    return res.status(200).json({
      message: "Login successful",
      userData: {
        id: user.id,
        username: user.userName,
        avatarUrl: user.avatar?.url,
      },
    });
  } catch (err) {
    const isCredError =
      err instanceof InvalidCredentialsError || err instanceof UserNotFoundError;

    audit({
      action: "AUTH_LOGIN_FAIL",
      actorUserId: user?.id,
      ip: req.ip,
      requestId: req.requestId,
      metadata: {
        userName,
        reason: isCredError ? "invalid_credentials" : "unexpected_error",
      },
    });
    throw err;
  }
};
