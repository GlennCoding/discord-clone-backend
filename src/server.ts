import "./config/loadEnvironment";
import express, {
  Request,
  Response,
  Errback,
  NextFunction,
  RequestHandler,
} from "express";
import cors from "cors";
import { connectDB } from "./config/dbConn";
import rootRouter from "./routes/root";
import authRouter from "./routes/auth";
import registerRouter from "./routes/register";
import verifyJWT from "./middleware/verifyJWT";
import userRouter from "./routes/api/users";
import refreshRouter from "./routes/refresh";
import cookieParser from "cookie-parser";
import credentials from "./middleware/credentials";
import corsOptions from "./config/corsOptions";
import getEnvVar from "./utils/getEnvVar";

const PORT = getEnvVar("PORT") || 3000;
const app = express();

connectDB();

app.use(credentials);
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

app.use("/", rootRouter);
app.use("/register", registerRouter);
app.use("/login", authRouter);
app.use("/refresh", refreshRouter);

app.use(verifyJWT as RequestHandler);
app.use("/user", userRouter);

// Global error handling
app.use((err: Errback, _req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).send(err);
});

// start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
