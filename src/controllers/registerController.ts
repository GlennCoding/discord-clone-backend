import { Request, Response } from "express";
import {
  createUser,
  findUserWithUserName,
  saveUserRefreshToken,
} from "../services/userService";
import { issueAuthToken, issueRefreshToken } from "../services/authService";
import { UsernameIsTakenError } from "../utils/errors";

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

  res.cookie("jwt", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 24 * 60 * 60 * 1000,
  });

  res
    .status(201)
    .json({ message: "User registered successfully.", token: accessToken });
};
