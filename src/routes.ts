import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { User } from "./models";
const bcryptSaltRounds = 10;

const router = Router();

router.get("/", (_, res: Response) => {
  res.send("Hello World!");
});

router.post("/register", async (req: Request, res: Response) => {
  const { user_name, password } = req.body;

  if (!user_name || !password) {
    res.status(400).json({ message: "user_name and password are required." });
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
    const hashedPassword = await bcrypt.hash(password, bcryptSaltRounds);
    const newUser = new User({ user_name, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

router.post("/login", async (req: Request, res: Response) => {
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

    if (isSamePassword === true) {
      res.status(200).json({ message: "Login successful" });
      return;
    }

    res.status(400).json({ message: "Username or password are incorrect" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

router.get("/user/status", async (_, res: Response) => {
  res.status(200).json({ message: "User has access to this route" });
});

export default router;
