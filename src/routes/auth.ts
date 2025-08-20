import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import getEnvVar from "../utils/getEnvVar";
import { verifyUser } from "../services/userService";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
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

  const user = await verifyUser(userName, password);

  // Generate new accessToken
  const accessToken = jwt.sign(
    {
      UserInfo: {
        userId: user._id,
      },
    },
    getEnvVar("ACCESS_TOKEN_SECRET"),
    { expiresIn: "20min" }
  );

  // Generate new resfreshToken
  const refreshToken = jwt.sign(
    {
      userId: user._id,
    },
    getEnvVar("REFRESH_TOKEN_SECRET"),
    { expiresIn: "1day" }
  );

  // Update refreshToken in DB
  user.refreshTokens = [refreshToken];
  await user.save();

  // Add refreshToken to cookies
  res.cookie("jwt", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 24 * 60 * 60 * 1000,
  });

  // Send 200 status & send accessToken back
  res.status(200).json({ message: "Login successful", token: accessToken });
});

export default router;
