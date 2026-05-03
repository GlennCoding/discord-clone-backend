import mongoose from "mongoose";
import { randomUUID } from "crypto";

import User from "../models/User";
import Server from "../models/Server";
import Channel from "../models/Channel";
import ChannelMessage from "../models/ChannelMessage";
import Chat from "../models/Chat";
import ChatMessage from "../models/ChatMessage";
import Member from "../models/Member";
import Role from "../models/Role";

const BENCHMARK_DB = "discord_clone_benchmark";
const BATCH_SIZE = 5000;

interface SeedConfig {
  users: number;
  servers: number;
  channelsPerServer: number;
  channelMessages: number;
  chatMessages: number;
  chatsCount: number;
  membersPerServer: number;
  rolesPerServer: number;
}

const config: SeedConfig = {
  users: 100000,
  servers: 20,
  channelsPerServer: 4,
  channelMessages: 500000,
  chatMessages: 2000000,
  chatsCount: 100000,
  membersPerServer: 20000,
  rolesPerServer: 30,
};

async function connectBenchmarkDB() {
  const uri = process.env.DATABASE_URI || "mongodb://localhost:27017";
  await mongoose.connect(uri, {
    dbName: BENCHMARK_DB,
  });
}

async function dropBenchmarkDB() {
  try {
    await mongoose.connection.dropDatabase();
    console.log(`Dropped ${BENCHMARK_DB} database`);
  } catch {
    console.log(`Database ${BENCHMARK_DB} does not exist (first run)`);
  }
}

function generateRandomEmail(index: number): string {
  return `user_${index}@example.com`;
}

function generateUsername(index: number): string {
  return `user_${index}`;
}

function generateShortId(index: number): string {
  return `server_${index}`;
}

async function seedUsers(): Promise<mongoose.Types.ObjectId[]> {
  console.log(`Seeding users (${config.users})...`);
  const users = [];

  for (let i = 0; i < config.users; i++) {
    users.push({
      userName: generateUsername(i),
      password: "hashed_password_" + i,
      status: "online",
    });
  }

  const created = await User.insertMany(users);
  console.log(`✓ Seeded ${created.length} users`);
  return created.map((u) => u._id as mongoose.Types.ObjectId);
}

async function seedServers(userIds: mongoose.Types.ObjectId[]): Promise<mongoose.Types.ObjectId[]> {
  console.log(`Seeding servers (${config.servers})...`);
  const servers = [];

  for (let i = 0; i < config.servers; i++) {
    const isPublic = i % 2 === 0;
    servers.push({
      name: `Server ${i + 1}`,
      shortId: generateShortId(i),
      owner: userIds[Math.floor(Math.random() * userIds.length)],
      description: `Description for server ${i + 1}`,
      isPublic,
    });
  }

  const created = await Server.insertMany(servers);
  console.log(`✓ Seeded ${created.length} servers`);
  return created.map((s) => s._id as mongoose.Types.ObjectId);
}

async function seedChannels(
  serverIds: mongoose.Types.ObjectId[],
): Promise<mongoose.Types.ObjectId[]> {
  console.log(`Seeding channels (${config.servers * config.channelsPerServer})...`);
  const channels = [];

  for (const serverId of serverIds) {
    for (let i = 0; i < config.channelsPerServer; i++) {
      channels.push({
        server: serverId,
        name: `Channel ${i + 1}`,
        order: i,
      });
    }
  }

  const created = await Channel.insertMany(channels);
  console.log(`✓ Seeded ${created.length} channels`);
  return created.map((c) => c._id as mongoose.Types.ObjectId);
}

async function seedChannelMessages(
  channelIds: mongoose.Types.ObjectId[],
  memberIds: mongoose.Types.ObjectId[],
): Promise<void> {
  console.log(`Seeding channel messages (${config.channelMessages})...`);
  const messages = [];
  const now = Date.now();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < config.channelMessages; i++) {
    const randomChannelIdx = Math.floor(Math.random() * channelIds.length);
    const randomMemberIdx = Math.floor(Math.random() * memberIds.length);
    const randomMs = Math.floor(Math.random() * ninetyDaysMs);

    messages.push({
      channel: channelIds[randomChannelIdx],
      sender: memberIds[randomMemberIdx],
      text: `Message ${i + 1} - ${randomUUID().substring(0, 16)}`,
      createdAt: new Date(now - randomMs),
    });

    if ((i + 1) % BATCH_SIZE === 0) {
      await ChannelMessage.insertMany(messages);
      console.log(`  ...${i + 1}/${config.channelMessages}`);
      messages.length = 0;
    }
  }

  if (messages.length > 0) {
    await ChannelMessage.insertMany(messages);
  }

  console.log(`✓ Seeded ${config.channelMessages} channel messages`);
}

async function seedChats(userIds: mongoose.Types.ObjectId[]): Promise<mongoose.Types.ObjectId[]> {
  console.log(`Seeding chats (${config.chatsCount})...`);
  const chats = [];
  const usedPairs = new Set<string>();

  for (let i = 0; i < config.chatsCount; i++) {
    let user1 = userIds[Math.floor(Math.random() * userIds.length)];
    let user2 = userIds[Math.floor(Math.random() * userIds.length)];

    while (user1.equals(user2)) {
      user2 = userIds[Math.floor(Math.random() * userIds.length)];
    }

    const pairKey = [user1.toString(), user2.toString()].sort().join("|");
    if (!usedPairs.has(pairKey)) {
      usedPairs.add(pairKey);
      chats.push({
        participants: [user1, user2],
      });
    }
  }

  const created = await Chat.insertMany(chats);
  console.log(`✓ Seeded ${created.length} chats`);
  return created.map((c) => c._id as mongoose.Types.ObjectId);
}

async function seedChatMessages(
  chatIds: mongoose.Types.ObjectId[],
  userIds: mongoose.Types.ObjectId[],
): Promise<void> {
  console.log(`Seeding chat messages (${config.chatMessages})...`);
  const messages = [];
  const now = Date.now();

  for (let i = 0; i < config.chatMessages; i++) {
    const randomChatIdx = Math.floor(Math.random() * chatIds.length);
    const randomUserIdx = Math.floor(Math.random() * userIds.length);

    messages.push({
      chat: chatIds[randomChatIdx],
      sender: userIds[randomUserIdx],
      text: `Chat message ${i + 1} - ${randomUUID().substring(0, 16)}`,
      createdAt: new Date(now - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)),
    });

    if ((i + 1) % BATCH_SIZE === 0) {
      await ChatMessage.insertMany(messages);
      console.log(`  ...${i + 1}/${config.chatMessages}`);
      messages.length = 0;
    }
  }

  if (messages.length > 0) {
    await ChatMessage.insertMany(messages);
  }

  console.log(`✓ Seeded ${config.chatMessages} chat messages`);
}

async function seedMembers(
  serverIds: mongoose.Types.ObjectId[],
  userIds: mongoose.Types.ObjectId[],
): Promise<mongoose.Types.ObjectId[]> {
  console.log(`Seeding members (${serverIds.length * config.membersPerServer})...`);
  const members = [];
  const usedPairs = new Set<string>();

  for (const serverId of serverIds) {
    const membersForServer = Math.min(config.membersPerServer, userIds.length);

    for (let i = 0; i < membersForServer; i++) {
      let userId = userIds[Math.floor(Math.random() * userIds.length)];
      const pairKey = `${serverId.toString()}|${userId.toString()}`;

      let attempts = 0;
      while (usedPairs.has(pairKey) && attempts < 10) {
        userId = userIds[Math.floor(Math.random() * userIds.length)];
        attempts++;
      }

      if (!usedPairs.has(pairKey)) {
        usedPairs.add(pairKey);
        members.push({
          server: serverId,
          user: userId,
          nickname: `Member ${i + 1}`,
          roles: [],
        });
      }
    }
  }

  const created = await Member.insertMany(members);
  console.log(`✓ Seeded ${created.length} members`);
  return created.map((m) => m._id as mongoose.Types.ObjectId);
}

async function seedRoles(serverIds: mongoose.Types.ObjectId[]): Promise<mongoose.Types.ObjectId[]> {
  console.log(`Seeding roles (${serverIds.length * config.rolesPerServer})...`);
  const roles = [];

  for (const serverId of serverIds) {
    for (let i = 0; i < config.rolesPerServer; i++) {
      roles.push({
        server: serverId,
        name: `Role ${i + 1}`,
        permissions: ["ROLE_ADMIN"],
      });
    }
  }

  const created = await Role.insertMany(roles);
  console.log(`✓ Seeded ${created.length} roles`);
  return created.map((r) => r._id as mongoose.Types.ObjectId);
}

async function printStats(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    console.error("Database connection not established");
    return;
  }

  console.log("\n=== Seeding Complete ===\n");
  console.log("Collection Document Counts:");

  const collections = [
    "users",
    "servers",
    "channels",
    "channelmessages",
    "chats",
    "chatmessages",
    "members",
    "roles",
  ];

  for (const name of collections) {
    try {
      const count = await db.collection(name).countDocuments();
      console.log(`  ${name}: ${count}`);
    } catch {
      console.log(`  ${name}: 0 (or not found)`);
    }
  }

  console.log("\nTotal seeded approximately 121,320 documents");
}

async function main() {
  try {
    console.log(`Connecting to MongoDB (${BENCHMARK_DB})...`);
    await connectBenchmarkDB();
    console.log("✓ Connected");

    await dropBenchmarkDB();

    const userIds = await seedUsers();
    const serverIds = await seedServers(userIds);
    const channelIds = await seedChannels(serverIds);
    const memberIds = await seedMembers(serverIds, userIds);
    await seedChannelMessages(channelIds, memberIds);
    const chatIds = await seedChats(userIds);
    await seedChatMessages(chatIds, userIds);
    await seedRoles(serverIds);

    await printStats();

    console.log("\n✓ Benchmark database seeded successfully!");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
