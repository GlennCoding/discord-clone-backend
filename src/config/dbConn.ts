import mongoose from "mongoose";

import { env } from "../utils/env";

export const DEFAULT_QUERY_MAX_TIME_MS = 10_000; // 10s

mongoose.set("strict", true);
mongoose.set("strictQuery", true);
mongoose.set("sanitizeFilter", true);

const connectDB = async () => {
  try {
    await mongoose.connect(env.DATABASE_URI as string, {
      dbName: env.DB_NAME as string,
      timeoutMS: DEFAULT_QUERY_MAX_TIME_MS,
    });
    console.log("DB connection successful");
  } catch (error) {
    console.error(error);
  }
};

export { connectDB };
