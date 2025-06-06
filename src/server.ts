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
import { connectDB } from "./config/dbConn";

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
import getEnvVar from "./utils/getEnvVar";
import verifySocketJWT from "./middleware/verifySocketJWT";
import onConnection from "./socketHandlers/onConnection";

// Load PORT from environment
const PORT = getEnvVar("PORT") || 8000;

// Initialize Express app
const app = express();

// Set trust proxy if behind reverse proxy (e.g. NGINX, Heroku)
app.set("trust proxy", true);

// Connect to database
connectDB();

// Middleware
app.use(credentials);
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Create HTTP server and attach Socket.IO to it
const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions,
});

// Attach Socket.IO middleware and handlers
io.use(verifySocketJWT);
io.on("connection", (socket: Socket) => onConnection(io, socket));

app.use("/", rootRouter);
app.use("/register", registerRouter);
app.use("/login", authRouter);
app.use("/refresh", refreshRouter);

app.use(verifyJWT as RequestHandler);
app.use("/user", userRouter);
app.use("/chat", chatRouter);
app.use("/message", messageRouter);

// Global error handler
app.use((err: Errback, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).send("Internal Server Error");
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server (HTTP + Socket.IO) is running on port ${PORT}`);
});
