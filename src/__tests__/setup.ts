import { config } from "dotenv-flow";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

config({ node_env: "test", path: process.cwd(), silent: true });

let mongod: MongoMemoryServer | null = null;

export const setupMongoDB = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
};

export const teardownMongoDB = async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
};
