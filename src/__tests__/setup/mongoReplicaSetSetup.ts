import { config } from "dotenv-flow";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

config({ node_env: "test", path: process.cwd(), silent: true });

let replSet: MongoMemoryReplSet;

export async function connectReplSet(): Promise<void> {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });

  const uri = replSet.getUri();
  await mongoose.connect(uri);
}

export async function disconnectReplSet(): Promise<void> {
  await mongoose.disconnect();
  await replSet.stop();
}

export async function clearDatabase(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

beforeAll(async () => {
  await connectReplSet();
});

afterAll(async () => {
  await disconnectReplSet();
});
