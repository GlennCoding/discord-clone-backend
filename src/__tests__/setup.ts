import { config } from "dotenv-flow";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll } from "vitest";

config({ node_env: "test", path: process.cwd(), silent: true });

let mongod: MongoMemoryServer | null = null;

export const setupMongoDB = async () => {
  if (mongoose.connection.readyState === 1) return;

  if (!mongod) {
    mongod = await MongoMemoryServer.create();
  }
  await mongoose.connect(mongod.getUri());
};

export const teardownMongoDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
};

beforeAll(async () => {
  await setupMongoDB();
});

afterAll(async () => {
  await teardownMongoDB();
});
