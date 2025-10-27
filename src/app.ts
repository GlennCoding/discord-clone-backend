import "./config/loadEnvironment";
import express from "express";
import cors from "cors";
import http from "http";

import rootRouter from "./routes/root";
import authRouter from "./routes/auth";
import profileRouter from "./routes/api/profile";
import registerRouter from "./routes/register";
import chatRouter from "./routes/api/chats";
import verifyJWT from "./middleware/verifyJWT";
import refreshRouter from "./routes/refresh";
import cookieParser from "cookie-parser";
import credentials from "./middleware/credentials";
import corsOptions from "./config/corsOptions";
import { errorMiddleware } from "./middleware/errorMiddleware";

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Set trust proxy if behind reverse proxy (e.g. NGINX, Heroku)
app.set("trust proxy", true);

// Middleware
app.use(credentials);
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// API routes
app.use("/", rootRouter);
app.use("/register", registerRouter);
app.use("/login", authRouter);
app.use("/refresh", refreshRouter);

app.use("/chat", verifyJWT, chatRouter);
app.use("/profile", verifyJWT, profileRouter);

app.use((_, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorMiddleware);

export { app, server };
