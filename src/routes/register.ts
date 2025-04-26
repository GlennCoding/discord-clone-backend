import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { getEnvVar } from "../utils/getEnvVar";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { user_name, password } = req.body;

  if (!user_name || !password) {
    res.status(400).json({ message: "username and password are required." });
    return;
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ user_name });

    if (existingUser) {
      res.status(409).json({ message: "Username already taken." });
      return;
    }

    // Create and save new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ user_name, password: hashedPassword });
    await newUser.save();

    const jwtSecret = getEnvVar("JWT_SECRET");

    const token = jwt.sign(
      {
        UserInfo: {
          userId: newUser._id,
        },
      },
      jwtSecret,
      { expiresIn: "10min" }
    );

    res.status(201).json({ message: "User registered successfully.", token: token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;
