import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import User from "../models/User";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { user_name, password } = req.body;

  if (!user_name || !password) {
    res.status(400).json({ message: "username and password are required." });
    return;
  }

  try {
    // Check if user already exists
    const duplicate = await User.findOne({ user_name }).exec();

    if (duplicate) {
      res.status(409).json({ message: "Username already taken." });
      return;
    }

    // Create and save new user
    const hashedPwd = await bcrypt.hash(password, 10);
    const newUser = await User.create({ user_name, password: hashedPwd });

    console.log(newUser);

    res.status(201).json({ message: "User registered successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;
