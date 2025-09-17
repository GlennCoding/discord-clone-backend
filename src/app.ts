import "./config/loadEnvironment";
import express, { RequestHandler } from "express";
import cors from "cors";
import http from "http";
import { Server, Socket } from "socket.io";

import rootRouter from "./routes/root";
import authRouter from "./routes/auth";
import registerRouter from "./routes/register";
import chatRouter from "./routes/api/chats";
import verifyJWT from "./middleware/verifyJWT";
import refreshRouter from "./routes/refresh";
import cookieParser from "cookie-parser";
import credentials from "./middleware/credentials";
import corsOptions from "./config/corsOptions";
import { errorMiddleware } from "./middleware/errorMiddleware";

// Initialize Express app
export const app = express();
export const server = http.createServer(app);

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

app.use(verifyJWT as RequestHandler);
app.use("/chat", chatRouter);

app.use(errorMiddleware);
