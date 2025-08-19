import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import User from "../models/User";
import jwt from "jsonwebtoken";
import getEnvVar from "../utils/getEnvVar";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { userName, password } = req.body;

  if (!userName || !password) {
    res.status(401).json({ message: "Username and password are required." });
    return;
  }

  try {
    // Check if user is in DB
    const foundUser = await User.findOne({ userName });

    if (!foundUser) {
      res
        .status(400)
        .json({ message: `A user with the username ${userName} doesn't exist` });
      return;
    }

    // Check pwd validity
    const isSamePassword = await bcrypt.compare(password, foundUser.password);

    if (isSamePassword !== true) {
      res.status(401).json({ message: "Username or password are incorrect" });
      return;
    }

    // Generate new accessToken
    const accessToken = jwt.sign(
      {
        UserInfo: {
          userId: foundUser._id,
        },
      },
      getEnvVar("ACCESS_TOKEN_SECRET"),
      { expiresIn: "20min" }
    );

    // Generate new resfreshToken
    const refreshToken = jwt.sign(
      {
        userId: foundUser._id,
      },
      getEnvVar("REFRESH_TOKEN_SECRET"),
      { expiresIn: "1day" }
    );

    // Update refreshToken in DB
    foundUser.refreshTokens = [refreshToken];
    await foundUser.save();

    // Add refreshToken to cookies
    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000,
    });

    // Send 200 status & send accessToken back
    res.status(200).json({ message: "Login successful", token: accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;
