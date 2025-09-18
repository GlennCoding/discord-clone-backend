import { Request, Response } from "express";
import { saveUserRefreshToken, verifyUserPassword } from "../services/userService";
import { issueAuthToken, issueRefreshToken } from "../services/authService";

export const handleLogin = async (req: Request, res: Response) => {
  if (!req.body) {
    res.status(400).json({ error: "Request body is missing" });
    return;
  }

  const { userName, password } = req.body;

  if (!userName || !password) {
    res.status(400).json({
      message: "Missing required fields: Username and password are required.",
    });
    return;
  }

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
  res.status(200).json({ message: "Login successful", token: accessToken });
};
