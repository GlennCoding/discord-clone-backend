import "./config/loadEnvironment";
import express, {
  Request,
  Response,
  Errback,
  NextFunction,
  RequestHandler,
} from "express";
import cors from "cors";
import { Server, Socket } from "socket.io";
import jwt, { JwtPayload } from "jsonwebtoken";
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
import User from "./models/User";

const PORT = getEnvVar("PORT") || 8000;
const app = express();

const io = new Server({
  cors: corsOptions,
});

connectDB();

app.use(credentials);
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      socket.emit("auth_error", {
        code: "NO_TOKEN",
        message: "No authentication token provided",
      });
      return next(new Error("No authentication token provided"));
    }

    // Verify and decode the JWT
    const decoded = jwt.verify(token, getEnvVar("ACCESS_TOKEN_SECRET"));

    // Get the user information from the database
    const user = await User.findById((decoded as JwtPayload).UserInfo.userId);
    if (!user) {
      socket.emit("auth_error", {
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
      return next(new Error("User not found"));
    }

    // Attach the user object to the socket
    socket.data.user = user;
    next();
  } catch (error) {
    console.error("Authentication error", error);

    // Handle JWT verification errors specifically
    if (error instanceof jwt.JsonWebTokenError) {
      socket.emit("auth_error", {
        code: "INVALID_TOKEN",
        message: "Invalid or expired authentication token",
      });
    }

    next(error as Error);
  }
});

io.on("connection", (socket: Socket) => {
  console.log("Connected!");

  socket.on("hello world", () => {
    console.debug("hello world");
  });

  socket.on("disconnect", () => {
    console.log("disconnected");
  });
});

app.use("/", rootRouter);
app.use("/register", registerRouter);
app.use("/login", authRouter);
app.use("/refresh", refreshRouter);

app.use(verifyJWT as RequestHandler);
app.use("/user", userRouter);
app.use("/chat", chatRouter);
app.use("/message", messageRouter);

// Global error handling
app.use((err: Errback, _req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).send(err);
});

// start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});

io.listen(8001);
