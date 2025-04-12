import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URI || "", {
      dbName: process.env.DB_NAME || "",
    });
    console.log("DB connection successful");
  } catch (error) {
    console.error(error);
  }
};

export { connectDB };
