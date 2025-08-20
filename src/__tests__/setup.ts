import { config } from "dotenv";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

config({ path: ".env.test" });

let mongod: MongoMemoryServer;

export const setupMongoDB = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
};

export const teardownMongoDB = async () => {
  await mongoose.disconnect();
  await mongod.stop();
};
