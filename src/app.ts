import "./config/loadEnvironment";
import express, { Router } from "express";
import cors from "cors";
import http from "http";

import rootRouter from "./routes/root";
import authRouter from "./routes/auth";
import refreshRouter from "./routes/refresh";
import logoutRouter from "./routes/logout";
import registerRouter from "./routes/register";
import profileRouter from "./routes/api/profile";
import meRouter from "./routes/api/me";
import messagesRouter from "./routes/api/messages";
import serverRouter from "./routes/api/servers";
import chatRouter from "./routes/api/chats";
import channelRouter from "./routes/api/channels";
import verifyJWT from "./middleware/verifyJWT";
import verifySsrJwt from "./middleware/verifySsrJwt";
import cookieParser from "cookie-parser";
import credentials from "./middleware/credentials";
import corsOptions from "./config/corsOptions";
import { errorMiddleware } from "./middleware/errorMiddleware";
import { initSocket } from "./sockets";
import { NotFoundError } from "./utils/errors";
import ssrServerRouter from "./routes/ssr/server";
import { attachUserIdToHttpLogger, httpLogger } from "./middleware/httpLogging";
import { env } from "./utils/env";

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

// Logging Middleware
if (env.NODE_ENV !== "test") {
  app.use(httpLogger);
  app.use(attachUserIdToHttpLogger);
}

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
