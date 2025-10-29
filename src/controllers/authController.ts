import { Request, Response } from "express";
import { saveUserRefreshToken, verifyUserPassword } from "../services/userService";
import { issueAuthToken, issueRefreshToken } from "../services/authService";
import { InputMissingError, RequestBodyIsMissingError } from "../utils/errors";
import { LoginDTO, MeDTO } from "../types/dto";

export const handleLogin = async (req: Request, res: Response) => {
  if (!req.body) throw new RequestBodyIsMissingError();

  const { userName, password } = req.body;

  if (!userName) throw new InputMissingError("Username");

  if (!password) throw new InputMissingError("Password");

  const user = await verifyUserPassword(userName, password);

  const accessToken = issueAuthToken(user);

  const refreshToken = issueRefreshToken(user);

  await saveUserRefreshToken(user, refreshToken);

  res.cookie("jwt", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 24 * 60 * 60 * 1000,
  });

  // Send 200 status & send accessToken back
  res.status(200).json({
    message: "Login successful",
    token: accessToken,
    userData: {
      id: user.id,
      username: user.userName,
      avatarUrl: user.avatar?.url,
    },
  } as LoginDTO);
};
