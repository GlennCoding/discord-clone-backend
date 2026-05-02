import { config } from "dotenv-flow";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll } from "vitest";

config({ node_env: "test", path: process.cwd(), silent: true });

let mongoServer: MongoMemoryServer | null = null;

export const setupMongoDB = async () => {
  if (mongoose.connection.readyState === 1) return;

  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
  }
  await mongoose.connect(mongoServer.getUri());
};

export const teardownMongoDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
};

beforeAll(async () => {
  await setupMongoDB();
});

afterAll(async () => {
  await teardownMongoDB();
});
