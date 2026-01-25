import mongoose from "mongoose";

import { env } from "../utils/env";

const connectDB = async () => {
  try {
    await mongoose.connect(env.DATABASE_URI as string, {
      dbName: env.DB_NAME as string,
    });
    console.log("DB connection successful");
  } catch (error) {
    console.error(error);
  }
};

export { connectDB };
