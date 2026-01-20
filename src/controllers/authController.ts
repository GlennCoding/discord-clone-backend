import { Response } from "express";
import { saveUserRefreshToken, verifyUserPassword } from "../services/userService";
import { issueAuthTokens } from "../services/authService";
import { CustomError, InputMissingError } from "../utils/errors";
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
  const { userName, password } = req.body;

  try {
    if (!userName) throw new InputMissingError("Username");

    if (!password) throw new InputMissingError("Password");

    let user: IUser | undefined;
    user = await verifyUserPassword(userName, password);
    const { accessToken, ssrAccessToken, refreshToken } =
      await issueAuthTokens(user);

    await saveUserRefreshToken(user, refreshToken);

    setAccessTokenCookie(res, accessToken);
    setSsrAccessTokenCookie(res, ssrAccessToken);
    setRefreshTokenCookie(res, refreshToken);

    audit(req, "AUTH_LOGIN_SUCCESS");

    return res.status(200).json({
      message: "Login successful",
      userData: {
        id: user.id,
        username: user.userName,
        avatarUrl: user.avatar?.url,
      },
    });
  } catch (err) {
    audit(req, "AUTH_LOGIN_FAIL", {
      metadata: {
        userName,
        reason: err instanceof CustomError ? err.name : "unexpected_error",
      },
    });

    throw err;
  }
};
