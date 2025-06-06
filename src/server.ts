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

io.use(verifySocketJWT);

io.on("connection", (socket) => onConnection(io, socket));

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
