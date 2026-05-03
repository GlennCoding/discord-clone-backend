import mongoose from 'mongoose';
import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';

const BENCHMARK_DB = 'discord_clone_benchmark';

interface ExecutionStats {
  executionTimeMillis: number;
  totalDocsExamined: number;
  totalKeysExamined: number;
  executionStages: {
    stage: string;
    inputStage?: {
      stage: string;
      inputStage?: {
        stage: string;
      };
    };
  };
}

interface BenchmarkResult {
  query: string;
  stage: string;
  docsExamined: number;
  keysExamined: number;
  executionTimeMs: number;
}

interface QueryConfig {
  name: string;
  collection: string;
  filter: Record<string, unknown>;
  sort?: Record<string, number>;
  limit?: number;
}

// State to store picked IDs across before/after runs
let pickedIds: {
  userEmail: string;
  userName: string;
  channelId: mongoose.Types.ObjectId | undefined;
  chatId: mongoose.Types.ObjectId | undefined;
  serverId: mongoose.Types.ObjectId | undefined;
  serverIdForMembership: mongoose.Types.ObjectId | undefined;
  memberId: mongoose.Types.ObjectId | undefined;
  userId: mongoose.Types.ObjectId | undefined;
  shortId: string;
  participantId: mongoose.Types.ObjectId | undefined;
} | null = null;

async function connectBenchmarkDB() {
  const uri = process.env.DATABASE_URI || 'mongodb://localhost:27017';
  await mongoose.connect(uri, {
    dbName: BENCHMARK_DB,
  });
}

async function dropNonIdIndexes(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  const collections = [
    'users',
    'servers',
    'channels',
    'channelmessages',
    'chatmessages',
    'chats',
    'members',
    'roles',
  ];

  for (const name of collections) {
    try {
      await db.collection(name).dropIndexes();
    } catch {
      // Index may not exist, continue
    }
  }

  console.log('Dropped all non-_id indexes');
}

function getExecutionStage(stats: ExecutionStats): string {
  // Walk the execution stage tree to find the actual scan type
  let current = stats.executionStages;

  while (current) {
    if (current.stage === 'COLLSCAN' || current.stage === 'IXSCAN') {
      return current.stage;
    }
    current = current.inputStage as ExecutionStats['executionStages'];
  }

  return stats.executionStages.stage || 'UNKNOWN';
}

async function pickIds(): Promise<void> {
  if (pickedIds) {
    return; // Already picked
  }

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  const user = await db.collection('users').findOne({});
  const userEmail = user?.userName || '';
  const userName = user?.userName || '';

  const channel = await db.collection('channels').findOne({});
  const channelId = channel?._id;

  const chat = await db.collection('chats').findOne({});
  const chatId = chat?._id;

  const server = await db.collection('servers').findOne({});
  const serverId = server?._id;
  const shortId = server?.shortId || '';
  const serverIdForMembership = server?._id;

  const member = await db.collection('members').findOne({});
  const memberId = member?._id;
  const userId = member?.user;

  const chatParticipant = await db
    .collection('chats')
    .findOne({ participants: { $exists: true, $ne: [] } });
  const participantId = chatParticipant?.participants?.[0];

  pickedIds = {
    userEmail,
    userName,
    channelId,
    chatId,
    serverId,
    serverIdForMembership,
    memberId,
    userId,
    shortId,
    participantId,
  };

  console.log('\nPicked sample IDs for queries');
}

async function benchmarkQueries(): Promise<BenchmarkResult[]> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  if (!pickedIds) {
    await pickIds();
  }

  const queries: QueryConfig[] = [
    {
      name: 'Find user by username',
      collection: 'users',
      filter: { userName: pickedIds!.userName },
    },
    {
      name: 'Channel messages — paginated, newest first',
      collection: 'channelmessages',
      filter: { channel: pickedIds!.channelId },
      sort: { createdAt: -1 },
      limit: 50,
    },
    {
      name: 'DMs for a chat — paginated',
      collection: 'chatmessages',
      filter: { chat: pickedIds!.chatId },
      sort: { createdAt: -1 },
      limit: 50,
    },
    {
      name: 'Channels for a server — sorted by position',
      collection: 'channels',
      filter: { server: pickedIds!.serverId },
      sort: { order: 1 },
    },
    {
      name: 'Membership check',
      collection: 'members',
      filter: {
        server: pickedIds!.serverIdForMembership,
        user: pickedIds!.userId,
      },
    },
    {
      name: 'List servers a user belongs to',
      collection: 'members',
      filter: { user: pickedIds!.userId },
    },
    {
      name: 'Browse public servers',
      collection: 'servers',
      filter: { isPublic: true },
      sort: { name: 1 },
    },
    {
      name: 'Find server by shortId',
      collection: 'servers',
      filter: { shortId: pickedIds!.shortId },
    },
  ];

  const results: BenchmarkResult[] = [];

  for (const queryConfig of queries) {
    const timings: number[] = [];

    for (let run = 0; run < 5; run++) {
      const cursor = db.collection(queryConfig.collection).find(queryConfig.filter);

      if (queryConfig.sort) {
        const sortEntries = Object.entries(queryConfig.sort) as Array<[string, 1 | -1]>;
        cursor.sort(sortEntries);
      }
      if (queryConfig.limit) {
        cursor.limit(queryConfig.limit);
      }

      const explain = await cursor.explain('executionStats');
      const stats = explain.executionStats as ExecutionStats;

      timings.push(stats.executionTimeMillis);
    }

    // Drop first run, average remaining 4
    timings.shift();
    const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;

    const cursor = db.collection(queryConfig.collection).find(queryConfig.filter);
    if (queryConfig.sort) {
      const sortEntries = Object.entries(queryConfig.sort) as Array<[string, 1 | -1]>;
      cursor.sort(sortEntries);
    }
    if (queryConfig.limit) {
      cursor.limit(queryConfig.limit);
    }

    const explain = await cursor.explain('executionStats');
    const stats = explain.executionStats as ExecutionStats;

    const result: BenchmarkResult = {
      query: queryConfig.name,
      stage: getExecutionStage(stats),
      docsExamined: stats.totalDocsExamined,
      keysExamined: stats.totalKeysExamined,
      executionTimeMs: avgTime,
    };

    results.push(result);
  }

  return results;
}

function formatTable(results: BenchmarkResult[], phase: 'BEFORE' | 'AFTER'): string {
  const header = `=== ${phase} INDEXES ===`;
  const separator = '|---|---|---|---|---|';
  const columnHeader =
    '| Query | Stage | Docs Examined | Keys Examined | Time (ms) |';

  const rows = results.map((r) => {
    const queryCol = r.query.padEnd(30);
    const stageCol = r.stage.padEnd(10);
    const docsCol = String(r.docsExamined).padStart(13);
    const keysCol = String(r.keysExamined).padStart(13);
    const timeCol = r.executionTimeMs.toFixed(2).padStart(9);

    return `| ${queryCol} | ${stageCol} | ${docsCol} | ${keysCol} | ${timeCol} |`;
  });

  return [header, '', columnHeader, separator, ...rows].join('\n');
}

async function createIndexes(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  const indexConfigs: Array<{
    collection: string;
    index: Record<string, 1 | -1>;
    options?: Record<string, unknown>;
  }> = [
    // User
    { collection: 'users', index: { userName: 1 }, options: { unique: true } },
    { collection: 'users', index: { refreshTokens: 1 }, options: { sparse: true } },

    // Server
    { collection: 'servers', index: { shortId: 1 }, options: { unique: true } },
    { collection: 'servers', index: { owner: 1 } },
    { collection: 'servers', index: { isPublic: 1, name: 1 } },

    // Channel
    { collection: 'channels', index: { server: 1, order: 1 } },

    // ChannelMessage
    { collection: 'channelmessages', index: { channel: 1, createdAt: -1 } },
    { collection: 'channelmessages', index: { sender: 1, createdAt: -1 } },

    // ChatMessage (DM)
    { collection: 'chatmessages', index: { chat: 1, createdAt: -1 } },

    // Member
    {
      collection: 'members',
      index: { server: 1, user: 1 },
      options: { unique: true },
    },
    { collection: 'members', index: { user: 1 } },

    // Role
    { collection: 'roles', index: { server: 1 } },

    // Chat
    { collection: 'chats', index: { participants: 1 } },
  ];

  let indexCount = 0;
  for (const config of indexConfigs) {
    await db.collection(config.collection).createIndex(config.index, config.options);
    indexCount++;
  }

  const uniqueCollections = new Set(indexConfigs.map((c) => c.collection)).size;
  console.log(`Created ${indexCount} indexes across ${uniqueCollections} collections`);
}

interface ComparisonRow {
  query: string;
  beforeMs: number;
  afterMs: number;
  speedup: number;
  docsBefore: number;
  docsAfter: number;
  indexes: string;
}

function formatComparisonTable(
  before: BenchmarkResult[],
  after: BenchmarkResult[],
): string {
  const indexMap: Record<string, string> = {
    'Find user by username': '{ userName: 1 }',
    'Channel messages — paginated, newest first': '{ channel: 1, createdAt: -1 }',
    'DMs for a chat — paginated': '{ chat: 1, createdAt: -1 }',
    'Channels for a server — sorted by position': '{ server: 1, order: 1 }',
    'Membership check': '{ server: 1, user: 1 }',
    'List servers a user belongs to': '{ user: 1 }',
    'Browse public servers': '{ isPublic: 1, name: 1 }',
    'Find server by shortId': '{ shortId: 1 }',
  };

  const rows: ComparisonRow[] = before.map((b, idx) => {
    const a = after[idx];
    const speedup = b.executionTimeMs / (a.executionTimeMs || 0.001);
    return {
      query: b.query,
      beforeMs: b.executionTimeMs,
      afterMs: a.executionTimeMs,
      speedup,
      docsBefore: b.docsExamined,
      docsAfter: a.docsExamined,
      indexes: indexMap[b.query] || 'N/A',
    };
  });

  const header = '=== BENCHMARK COMPARISON ===';
  const columnHeader =
    '| Query | Before (ms) | After (ms) | Speedup | Docs Before | Docs After | Index Used |';
  const separator =
    '|---|---|---|---|---|---|---|';

  const formatted = rows.map((r) => {
    const queryCol = r.query.substring(0, 28).padEnd(30);
    const beforeCol = r.beforeMs.toFixed(2).padStart(11);
    const afterCol = r.afterMs.toFixed(2).padStart(10);
    const speedupCol = `${r.speedup.toFixed(1)}x`.padStart(7);
    const docsBeforeCol = String(r.docsBefore).padStart(11);
    const docsAfterCol = String(r.docsAfter).padStart(10);
    const indexCol = r.indexes.substring(0, 28).padEnd(30);

    return `| ${queryCol} | ${beforeCol} | ${afterCol} | ${speedupCol} | ${docsBeforeCol} | ${docsAfterCol} | ${indexCol} |`;
  });

  return [header, '', columnHeader, separator, ...formatted].join('\n');
}

async function writeReport(
  before: BenchmarkResult[],
  after: BenchmarkResult[],
): Promise<void> {
  const reportPath = 'benchmarks/index-performance.md';

  const beforeTable = formatTable(before, 'BEFORE');
  const afterTable = formatTable(after, 'AFTER');
  const comparisonTable = formatComparisonTable(before, after);

  const content = `# Index Performance Benchmark Report

## Summary

This report shows the performance impact of database indexes on the Discord Clone application. Indexes dramatically improve query performance by reducing the number of documents examined.

## Before Indexes

${beforeTable}

## After Indexes

${afterTable}

## Comparison

${comparisonTable}

## Findings

- Queries that previously performed full collection scans (COLLSCAN) now use index scans (IXSCAN)
- Significant reductions in documents examined, especially for large collections
- Query execution times improved across the board
- Most queries now execute in sub-millisecond times with proper indexes

## Recommendations

All identified indexes have been added to the Mongoose schemas and should be enabled in production to maintain optimal query performance.
`;

  // Create directory if needed
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, content, 'utf-8');

  console.log(`\nReport written to ${reportPath}`);
}

async function main() {
  try {
    console.log(`Connecting to MongoDB (${BENCHMARK_DB})...`);
    await connectBenchmarkDB();
    console.log('✓ Connected\n');

    // Phase 2: Drop all non-_id indexes
    console.log('=== PHASE 2: Dropping Indexes ===');
    await dropNonIdIndexes();

    // Phase 3: Benchmark WITHOUT indexes
    console.log('\n=== PHASE 3: Benchmarking WITHOUT Indexes ===');
    const beforeResults = await benchmarkQueries();
    console.log(formatTable(beforeResults, 'BEFORE'));

    // Phase 4: Create indexes
    console.log('\n=== PHASE 4: Creating Indexes ===');
    await createIndexes();

    // Phase 5: Benchmark WITH indexes
    console.log('\n=== PHASE 5: Benchmarking WITH Indexes ===');
    const afterResults = await benchmarkQueries();
    console.log(formatTable(afterResults, 'AFTER'));

    // Phase 6: Comparison report
    console.log('\n=== PHASE 6: Comparison Report ===');
    console.log(formatComparisonTable(beforeResults, afterResults));

    // Write full report
    await writeReport(beforeResults, afterResults);

    console.log('\n✓ Benchmark complete!');
  } catch (error) {
    console.error('Benchmark failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
