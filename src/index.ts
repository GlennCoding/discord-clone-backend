import "./config/loadEnvironment";
import express, { Request, Response, Errback, NextFunction } from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import { connectDB } from "./config/dbConn";
import mongoose from "mongoose";

const PORT = process.env.PORT || 3000;
const app = express();

connectDB();

app.use(cors());
app.use(express.json());

const userSchema = new mongoose.Schema({ user_name: String, password: String });
const User = mongoose.model("User", userSchema);

app.get("/", (_, res: Response) => {
  res.send("Hello World!");
});

app.post("/register", async (req: Request, res: Response) => {
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
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ user_name, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// Global error handling
app.use((err: Errback, _req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).send(err);
});

// start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
