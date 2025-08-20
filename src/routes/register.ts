import { Router, Request, Response } from "express";
import User from "../models/User";
import { createUser } from "../services/userService";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { userName, password } = req.body;

  if (userName === undefined || password === undefined) {
    res.status(400).json({ error: "username and password are required." });
    return;
  }

  // Check if user already exists
  const duplicate = await User.findOne({ userName }).exec();

  if (duplicate) {
    res.status(409).json({ error: "Username already taken." });
    return;
  }

  // Create and save new user
  await createUser(userName, password);

  res.status(201).json({ message: "User registered successfully." });
});

export default router;
