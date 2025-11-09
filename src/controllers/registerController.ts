import { Request, Response } from "express";
import {
  createUser,
  findUserWithUserName,
  saveUserRefreshToken,
} from "../services/userService";
import { issueAuthToken, issueRefreshToken } from "../services/authService";
import { UsernameIsTakenError } from "../utils/errors";
import { setAccessTokenCookie, setRefreshTokenCookie } from "../config/tokenCookies";

export const handleRegister = async (req: Request, res: Response) => {
  const { userName, password } = req.body;

  if (userName === undefined || password === undefined) {
    res.status(400).json({ error: "username and password are required." });
    return;
  }

  const usernameExistsAlready = await findUserWithUserName(userName);

  if (usernameExistsAlready) throw new UsernameIsTakenError();

  const user = await createUser(userName, password);

  const accessToken = issueAuthToken(user);

  const refreshToken = issueRefreshToken(user);

  await saveUserRefreshToken(user, refreshToken);

  setAccessTokenCookie(res, accessToken);
  setRefreshTokenCookie(res, refreshToken);

  return res.status(201).json({
    message: "Registered successfully",
    userData: {
      id: user.id,
      username: user.userName,
      avatarUrl: user.avatar?.url,
    },
  });
};
