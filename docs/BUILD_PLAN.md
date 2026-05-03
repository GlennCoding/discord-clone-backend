# BUILD_PLAN.md — Indexing Performance Benchmarks

## Goal

Prove that indexes dramatically improve query performance in the Discord Clone.
Produce a benchmark report (before/after) and implement all indexes in the Mongoose schemas.

---

## Context

- **Stack**: Node.js, Express, MongoDB, Mongoose, Vitest
- **DB**: Local MongoDB via Docker (`docker compose up -d`)
- **Models live in**: `src/models/`
- **Existing project**: See `README.md`, `CODING_GUIDELINES.md` for conventions

---

## Phase 1 — Seed Script

Create `src/scripts/seed-benchmark.ts`.

This script connects to a **separate database** (`discord_clone_benchmark`) so it never touches dev data. It seeds:

| Collection | Count | Notes |
|---|---|---|
| Users | 200 | Fake emails/usernames (use `crypto.randomUUID()` or similar — no external deps) |
| Servers | 20 | Each owned by a random user, half public / half private |
| Channels | 80 | 4 per server |
| ChannelMessages | 100,000 | Distributed across all 80 channels (~1,250 per channel). Random senders from server members. Random `createdAt` spanning the last 90 days |
| Messages (DMs) | 20,000 | Across 100 chats, ~200 per chat |
| Chats | 100 | Random pairs of users, each with a `lastMessage` embedded |
| ServerMembers | 400 | ~20 members per server (no duplicates) |
| Roles | 60 | 3 per server |

### Implementation notes

- Use `Model.insertMany()` with batches of 5,000 for large collections (ChannelMessages, Messages)
- Generate ObjectIds manually with `new mongoose.Types.ObjectId()` so you can reference them across collections
- Use the existing Mongoose models — import them from `src/models/`
- Print progress: `Seeding users... done (200)` etc.
- At the end, print total document counts per collection
- Add a `pnpm run seed:benchmark` script to `package.json`

**100K channel messages is fine for a local Mac — it's ~50MB of data and seeds in under 30 seconds.**

---

## Phase 2 — Drop All Non-_id Indexes

Create `src/scripts/benchmark-indexes.ts`. This is the main benchmark runner.

### Step 2a — Connect to `discord_clone_benchmark`

### Step 2b — Drop all non-_id indexes on every collection

```ts
const collections = ['users', 'servers', 'channels', 'channelmessages', 'messages', 'chats', 'servermembers', 'roles'];
for (const name of collections) {
  await mongoose.connection.db.collection(name).dropIndexes();
}
```

Print confirmation: `Dropped all non-_id indexes`.

---

## Phase 3 — Benchmark WITHOUT Indexes

Run these 10 queries using the **MongoDB driver directly** (not Mongoose `.find()`) so you can call `.explain("executionStats")`. Pick real ObjectIds from the seeded data (query one document first to get valid IDs).

For each query, extract and store:
- `executionStats.executionTimeMillis`
- `executionStats.totalDocsExamined`
- `executionStats.totalKeysExamined`
- `executionStats.executionStages.stage` (top-level stage — may be nested under `executionStages.inputStage`)
- Whether stage is `COLLSCAN` or `IXSCAN` (walk the stage tree to find the actual scan type)

### Queries

```
 1. Find user by email
    db.users.find({ email: <pick one> }).limit(1)

 2. Find user by username
    db.users.find({ username: <pick one> }).limit(1)

 3. Channel messages — paginated, newest first (THE critical query)
    db.channelmessages.find({ channel: <pick one> }).sort({ createdAt: -1 }).limit(50)

 4. DMs for a chat — paginated
    db.messages.find({ chat: <pick one> }).sort({ createdAt: -1 }).limit(50)

 5. Channels for a server — sorted by position
    db.channels.find({ server: <pick one> }).sort({ position: 1 })

 6. Membership check — does user belong to server?
    db.servermembers.findOne({ server: <pick one>, user: <pick one that's a member> })

 7. List servers a user belongs to
    db.servermembers.find({ user: <pick one> })

 8. Browse public servers
    db.servers.find({ isPublic: true }).sort({ name: 1 })

 9. Find server by shortId
    db.servers.findOne({ shortId: <pick one> })

10. List chats for a user — sorted by last activity
    db.chats.find({ participants: <pick one> }).sort({ "lastMessage.timestamp": -1 })
```

Run each query **5 times**, discard the first run (cold cache), and average the remaining 4.

Store all results in an array:
```ts
type BenchmarkResult = {
  query: string;           // human-readable name
  stage: string;           // COLLSCAN or IXSCAN
  docsExamined: number;
  keysExamined: number;
  executionTimeMs: number; // averaged
};
```

Print a table to stdout:
```
=== BEFORE INDEXES ===
| Query                     | Stage    | Docs Examined | Keys Examined | Time (ms) |
|---------------------------|----------|---------------|---------------|-----------|
| Find user by email        | COLLSCAN | 200           | 0             | 12        |
| Channel messages (page)   | COLLSCAN | 100000        | 0             | 380       |
| ...                       | ...      | ...           | ...           | ...       |
```

---

## Phase 4 — Create Indexes

After the "before" benchmark completes, create all indexes **programmatically** in the benchmark script:

```ts
// User
await db.collection('users').createIndex({ email: 1 }, { unique: true });
await db.collection('users').createIndex({ username: 1 }, { unique: true });
await db.collection('users').createIndex({ refreshToken: 1 }, { sparse: true });

// Server
await db.collection('servers').createIndex({ shortId: 1 }, { unique: true });
await db.collection('servers').createIndex({ owner: 1 });
await db.collection('servers').createIndex({ isPublic: 1, name: 1 });
await db.collection('servers').createIndex({ name: 'text', description: 'text' });

// Channel
await db.collection('channels').createIndex({ server: 1, position: 1 });

// ChannelMessage
await db.collection('channelmessages').createIndex({ channel: 1, createdAt: -1 });
await db.collection('channelmessages').createIndex({ sender: 1, createdAt: -1 });

// Message (DM)
await db.collection('messages').createIndex({ chat: 1, createdAt: -1 });

// ServerMember
await db.collection('servermembers').createIndex({ server: 1, user: 1 }, { unique: true });
await db.collection('servermembers').createIndex({ user: 1 });

// Role
await db.collection('roles').createIndex({ server: 1 });

// Chat
await db.collection('chats').createIndex({ participants: 1 });
await db.collection('chats').createIndex({ 'lastMessage.timestamp': -1 });
```

Print: `Created N indexes across M collections`.

---

## Phase 5 — Benchmark WITH Indexes

Re-run the **exact same 10 queries** from Phase 3 with the same ObjectIds.
Same averaging strategy (5 runs, drop first, average 4).

Print a second table:
```
=== AFTER INDEXES ===
| Query                     | Stage  | Docs Examined | Keys Examined | Time (ms) |
|---------------------------|--------|---------------|---------------|-----------|
| Find user by email        | IXSCAN | 1             | 1             | 0.1       |
| Channel messages (page)   | IXSCAN | 50            | 50            | 1.2       |
| ...                       | ...    | ...           | ...           | ...       |
```

---

## Phase 6 — Comparison Report

Print a final combined table:

```
=== BENCHMARK COMPARISON ===
| Query                     | Before (ms) | After (ms) | Speedup | Docs Before | Docs After | Index Used                        |
|---------------------------|-------------|------------|---------|-------------|------------|-----------------------------------|
| Find user by email        | 12          | 0.1        | 120x    | 200         | 1          | { email: 1 }                     |
| Channel messages (page)   | 380         | 1.2        | 317x    | 100000      | 50         | { channel: 1, createdAt: -1 }    |
| ...                       | ...         | ...        | ...     | ...         | ...        | ...                               |
```

Also write this report to `benchmarks/index-performance.md` as a markdown file (create the directory if needed).

---

## Phase 7 — Add Indexes to Mongoose Schemas

Now that benchmarks are done, **permanently add the indexes to the actual Mongoose model files** in `src/models/`.

Use the Mongoose schema `.index()` method. Add them after the schema definition, before the model export. Example:

```ts
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ refreshToken: 1 }, { sparse: true });
```

Do this for every model file. Add a comment above each index explaining what query it supports:

```ts
// Supports: login — find user by email (unique constraint)
userSchema.index({ email: 1 }, { unique: true });
```

**Check if any indexes are already defined** in the schema (e.g., `unique: true` on a field in the schema definition). If so, prefer the explicit `.index()` call and remove the inline `unique` from the schema field to keep index definitions in one place. Use your judgment — if the codebase convention is inline, keep it inline.

---

## Phase 8 — Add npm Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "seed:benchmark": "npx tsx src/scripts/seed-benchmark.ts",
    "benchmark:indexes": "npx tsx src/scripts/benchmark-indexes.ts"
  }
}
```

---

## Execution Order

```bash
# 1. Make sure MongoDB is running
docker compose up -d

# 2. Seed the benchmark database
pnpm run seed:benchmark

# 3. Run the full benchmark (drops indexes → before → creates indexes → after → report)
pnpm run benchmark:indexes

# 4. Check the report
cat benchmarks/index-performance.md
```

---

## File Checklist

| File | Action |
|---|---|
| `src/scripts/seed-benchmark.ts` | Create |
| `src/scripts/benchmark-indexes.ts` | Create |
| `benchmarks/index-performance.md` | Generated by benchmark script |
| `src/models/*.ts` | Add `.index()` calls |
| `package.json` | Add two scripts |

---

## Rules

- Do NOT install new dependencies. Use only what's already in the project (`mongoose`, `tsx`, etc.)
- Use the existing Mongoose models for seeding — don't redefine schemas
- The benchmark script must be fully self-contained: run once, get the full report
- Use `discord_clone_benchmark` as the database name — never touch the dev database
- Clean up: at the start of the seed script, drop the `discord_clone_benchmark` database if it exists
- All output should be readable in a terminal — use padded columns for tables
