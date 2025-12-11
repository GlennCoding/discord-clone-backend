import { config } from "dotenv-flow";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll } from "vitest";

config({ node_env: "test", path: process.cwd(), silent: true });

let mongoReplSet: MongoMemoryReplSet | null = null;

export const setupMongoDB = async () => {
  if (mongoose.connection.readyState === 1) return;

  if (!mongoReplSet) {
    mongoReplSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
  }
  await mongoose.connect(mongoReplSet.getUri());
};

export const teardownMongoDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoReplSet) {
    await mongoReplSet.stop();
    mongoReplSet = null;
  }
};

beforeAll(async () => {
  await setupMongoDB();
});

afterAll(async () => {
  await teardownMongoDB();
});
