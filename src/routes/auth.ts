import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import User from "../models/User";
import jwt from "jsonwebtoken";
import { getEnvVar } from "../utils/getEnvVar";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { user_name, password } = req.body;

  if (!user_name || !password) {
    res.status(401).json({ message: "Username and password are required." });
    return;
  }

  try {
    const foundUser = await User.findOne({ user_name });

    if (!foundUser) {
      res
        .status(400)
        .json({ message: `A user with the username ${user_name} doesn't exist` });
      return;
    }

    const isSamePassword = await bcrypt.compare(password, foundUser.password);

    if (isSamePassword !== true) {
      res.status(401).json({ message: "Username or password are incorrect" });
      return;
    }

    const accessToken = jwt.sign(
      {
        UserInfo: {
          userId: foundUser._id,
        },
      },
      getEnvVar("ACCESS_TOKEN_SECRET"),
      { expiresIn: "10min" }
    );

    const refreshToken = jwt.sign(
      {
        userId: foundUser._id,
      },
      getEnvVar("REFRESH_TOKEN_SECRET"),
      { expiresIn: "1day" }
    );

    foundUser.refreshTokens = [...foundUser.refreshTokens, refreshToken];

    const result = await foundUser.save();
    console.log(result);

    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ message: "Login successful", token: accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;
