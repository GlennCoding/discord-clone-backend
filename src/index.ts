import "./config/loadEnvironment";
import express, { Request, Response, Errback, NextFunction } from "express";
import cors from "cors";
import { connectDB } from "./config/dbConn";
import routes from "./routes";

const PORT = process.env.PORT || 3000;
const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use(routes);

// Global error handling
app.use((err: Errback, _req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).send(err);
});

// start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
