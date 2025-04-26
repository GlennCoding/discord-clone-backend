import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import User from "../models/User";
import jwt from "jsonwebtoken";
import { getEnvVar } from "../utils/getEnvVar";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { user_name, password } = req.body;

  if (!user_name || !password) {
    res.status(400).json({ message: "Username and password are required." });
    return;
  }

  try {
    const existingUser = await User.findOne({ user_name });

    if (!existingUser) {
      res
        .status(400)
        .json({ message: `A user with the username ${user_name} doesn't exist` });
      return;
    }

    const isSamePassword = await bcrypt.compare(password, existingUser.password);

    const jwtSecret = getEnvVar("JWT_SECRET");

    const token = jwt.sign(
      {
        UserInfo: {
          userId: existingUser._id,
        },
      },
      jwtSecret,
      { expiresIn: "1sec" }
    );

    if (isSamePassword === true) {
      res.status(200).json({ message: "Login successful", token: token });
      return;
    }

    res.status(400).json({ message: "Username or password are incorrect" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;
