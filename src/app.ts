import "./config/loadEnvironment";
import express, {
  Request,
  Response,
  Errback,
  NextFunction,
  RequestHandler,
} from "express";
import cors from "cors";
import http from "http";
import { Server, Socket } from "socket.io";

import rootRouter from "./routes/root";
import authRouter from "./routes/auth";
import registerRouter from "./routes/register";
import chatRouter from "./routes/api/chats";
import messageRouter from "./routes/api/messages";
import verifyJWT from "./middleware/verifyJWT";
import userRouter from "./routes/api/users";
import refreshRouter from "./routes/refresh";
import cookieParser from "cookie-parser";
import credentials from "./middleware/credentials";
import corsOptions from "./config/corsOptions";
import verifySocketJWT from "./middleware/verifySocketJWT";
import onConnection from "./socketHandlers/onConnection";
import { errorMiddleware } from "./middleware/errorMiddleware";

// Initialize Express app
export const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

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
app.use("/user", userRouter);
app.use("/chat", chatRouter);
app.use("/message", messageRouter);

app.use(errorMiddleware);

// Socket.IO middleware and handlers
io.use(verifySocketJWT);
io.on("connection", (socket: Socket) => onConnection(io, socket));
