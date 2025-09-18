import mongoose from "mongoose";
import getEnvVar from "../utils/getEnvVar";

const connectDB = async () => {
  try {
    await mongoose.connect(getEnvVar("DATABASE_URI"), {
      dbName: getEnvVar("DB_NAME"),
    });
    console.log("DB connection successful");
  } catch (error) {
    console.error(error);
  }
};

export { connectDB };
