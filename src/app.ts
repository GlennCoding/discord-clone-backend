import "./config/loadEnvironment";
import express from "express";
import cors from "cors";
import http from "http";

import rootRouter from "./routes/root";
import authRouter from "./routes/auth";
import refreshRouter from "./routes/refresh";
import registerRouter from "./routes/register";
import profileRouter from "./routes/api/profile";
import messagesRouter from "./routes/api/messages";
import chatRouter from "./routes/api/chats";
import verifyJWT from "./middleware/verifyJWT";
import cookieParser from "cookie-parser";
import credentials from "./middleware/credentials";
import corsOptions from "./config/corsOptions";
import { errorMiddleware } from "./middleware/errorMiddleware";
import { initSocket } from "./sockets";

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = initSocket();

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
app.use("/messages", verifyJWT, messagesRouter);

app.use((_, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorMiddleware);

export { app, server, io };
