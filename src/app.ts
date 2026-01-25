import "./config/loadEnvironment";
import http from "http";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import corsOptions from "./config/corsOptions";
import credentials from "./middleware/credentials";
import { errorMiddleware } from "./middleware/errorMiddleware";
import { attachUserIdToHttpLogger, httpLogger } from "./middleware/httpLogging";
import { globalLimiter } from "./middleware/rateLimit";
import verifyJWT from "./middleware/verifyJWT";
import verifySsrJwt from "./middleware/verifySsrJwt";
import channelRouter from "./routes/api/channels";
import chatRouter from "./routes/api/chats";
import meRouter from "./routes/api/me";
import messagesRouter from "./routes/api/messages";
import profileRouter from "./routes/api/profile";
import serverRouter from "./routes/api/servers";
import authRouter from "./routes/auth";
import logoutRouter from "./routes/logout";
import refreshRouter from "./routes/refresh";
import registerRouter from "./routes/register";
import rootRouter from "./routes/root";
import ssrServerRouter from "./routes/ssr/server";
import { initSocket } from "./sockets";
import { NotFoundError } from "./utils/errors";

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

// Rate Limiting
app.use(globalLimiter);

// Logging Middleware
app.use(httpLogger);
app.use(attachUserIdToHttpLogger);

app.use("/", rootRouter);

// Auth routes
app.use("/register", registerRouter);
app.use("/login", authRouter);
app.use("/refresh", refreshRouter);
app.use("/logout", logoutRouter);

// API routes
app.use("/me", verifyJWT, meRouter);
app.use("/chat", verifyJWT, chatRouter);
app.use("/profile", verifyJWT, profileRouter);
app.use("/messages", verifyJWT, messagesRouter);
app.use("/server", verifyJWT, serverRouter);
app.use("/channel", verifyJWT, channelRouter);

// SSR routes
app.use("/ssr/server", verifySsrJwt, ssrServerRouter);

app.use((_, res) => {
  throw new NotFoundError("endpoint");
});

app.use(errorMiddleware);

export { app, server, io };
