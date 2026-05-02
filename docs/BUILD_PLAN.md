# BUILD_PLAN.md — Repository Layer Refactor

## Goal

Refactor all services that currently call Mongoose directly so that every DB
operation is delegated to a typed repository, following the pattern already
established in `ChatMessageAttachmentService`. Each service becomes a class
that receives its repositories (and any infrastructure adapters) via
constructor injection, with no Mongoose imports remaining in the service layer.

---

## Reference Material

Before starting, read and internalize:

- `CODING_GUIDELINES.md` — layer responsibilities, placement rules, error
  handling, and the PR checklist.
- `STYLE_GUIDELINES.md` — naming conventions, TypeScript rules, import order.
- `src/repositories/chatMessageRepository.ts` — the canonical repository
  interface + Mongoose implementation pattern to replicate.
- `src/services/chatMessageAttachmentService.ts` — the canonical service
  pattern (class, constructor injection, typed errors) to replicate.

---

## Conventions to Follow Throughout

| Concern | Rule |
|---|---|
| Repository interface | `interface XRepository { … }` in `src/repositories/xRepository.ts` |
| Mongoose implementation | `class MongooseXRepository implements XRepository` in the same file |
| Entity types | Plain TS types in `src/types/entities.ts`; no Mongoose `Document` leaking out |
| Service shape | Class with `constructor(private repo: XRepository, …)` |
| Errors | Only typed domain errors (`NotFoundError`, `ForbiddenError`, etc.) |
| Transactions | Coordinated in the service via a `withTransaction` helper or repository method; never raw `mongoose.startSession()` in a service |
| Exports | Named exports only; no default exports for repositories |

---

## Phase 1 — Shared Infrastructure & Entity Types

**Why first:** Every subsequent phase depends on stable entity types and any
shared repository utilities. Doing this upfront prevents churn.

### Tasks

1. **Audit `src/types/entities.ts`** (or create it if absent).  
   Ensure entity types exist for every domain object that will be returned by
   repositories:
   - `UserEntity`
   - `ChatEntity` (must expose `participantIds: string[]`, not Mongoose
     `ObjectId[]`)
   - `ChatMessageEntity` *(already exists — verify it is complete)*
   - `ServerEntity`
   - `ChannelEntity`
   - `ChannelMessageEntity`
   - `RoleEntity` *(if used by serverService / channelService)*

2. **Create a `withTransaction` helper** in
   `src/repositories/transactionHelper.ts` that wraps
   `mongoose.startSession()` + `session.withTransaction(…)` + cleanup, so
   services never import `mongoose` for transactions.

   ```ts
   // src/repositories/transactionHelper.ts
   export async function withTransaction<T>(
     work: (session: mongoose.ClientSession) => Promise<T>
   ): Promise<T> { … }
   ```

3. **Verify the existing repositories** (`chatMessageRepository`,
   `chatRepository`, `userRepository`) are complete and consistent with the
   entity types defined in step 1. Fix any gaps before moving on.

### Acceptance Criteria
- `src/types/entities.ts` exports all entity types listed above.
- `withTransaction` is exported and tested with a trivial integration test.
- Existing repositories compile cleanly against the entity types.

---

## Phase 2 — `userRepository` & `authService` + `userService` + `profileService`

**Why together:** `authService`, `userService`, and `profileService` all
revolve around the `User` model. A single `UserRepository` serves all three,
so building the repository once and refactoring all three services in one
phase avoids revisiting the same interface.

### Tasks

#### 2a — Extend / create `UserRepository`

File: `src/repositories/userRepository.ts`

Ensure the interface covers every query currently made across the three
services. 

#### 2b — Refactor `authService.ts`

- Convert to a class `AuthService`.
- Constructor: `(private user: UserRepository)`.
- Remove all `import … from "../models/User"` and `import mongoose`.
- Methods: `register`, `login`, `refresh`, `logout`, `getMe` (or equivalent).
- Password hashing stays in the service (it is business logic, not DB access).

#### 2c — Refactor `userService.ts`

- Convert to a class `UserService`.
- Constructor: `(private user: UserRepository)`.
- Remove all direct model imports.

#### 2d — Refactor `profileService.ts`

- Convert to a class `ProfileService`.
- Constructor: `(private user: UserRepository, private fileStorage: FileStorage)`.
- Remove all direct model imports.

#### 2e — Update DI wiring

Update wherever these services are instantiated (controllers, socket handlers,
`app.ts`) to pass the `MongooseUserRepository` instance.

### Acceptance Criteria
- No `import … from "../models/User"` or `import mongoose` in any of the three
  services.
- All existing unit tests pass; add unit tests for any untested service methods
  using a mocked `UserRepository`.

---

## Phase 3 — `chatRepository` & `chatService`

**Why its own phase:** `chatService.deleteChat` uses a multi-model transaction
(deletes `Message` + `Chat`). This is the most complex repository interaction
and deserves focused attention.

### Tasks

#### 3a — Extend `ChatRepository`

File: `src/repositories/chatRepository.ts`

```ts
interface ChatRepository {
  findById(id: string): Promise<ChatEntity | null>;
  findByParticipants(userId: string): Promise<ChatEntity[]>;
  findBetweenUsers(user1Id: string, user2Id: string): Promise<ChatEntity | null>;
  create(user1Id: string, user2Id: string): Promise<ChatEntity>;
  deleteWithMessages(chatId: string): Promise<void>; // encapsulates the transaction
}
```

- `deleteWithMessages` uses `withTransaction` from Phase 1 internally; it
  imports both `Chat` and `Message` Mongoose models — that is acceptable
  because repositories are the only layer allowed to touch models.

#### 3b — Refactor `chatService.ts`

- Convert to a class `ChatService`.
- Constructor: `(private chat: ChatRepository, private user: UserRepository)`.
- Remove `import mongoose`, `import Chat`, `import Message`.
- `checkIfUserIdPartOfChat` becomes a pure helper using `chat.participantIds`
  (string array from the entity) — no `mongoose.Types.ObjectId` needed.
- `formatUserChats` stays as a pure function (no DB access, no class needed).

#### 3c — Update DI wiring

### Acceptance Criteria
- `chatService.ts` has zero Mongoose imports.
- `deleteChat` still runs atomically (transaction is inside the repository).
- Unit tests for `ChatService` mock `ChatRepository`; the transaction logic is
  covered by a repository-level integration test.

---

## Phase 4 — `serverRepository` & `serverService`

### Tasks

#### 4a — Create `ServerRepository`

File: `src/repositories/serverRepository.ts`

Derive the interface by reading every `Server` model call in `serverService.ts`.


#### 4b — Refactor `serverService.ts`

- Convert to a class `ServerService`.
- Constructor: `(private server: ServerRepository, private user: UserRepository)`.
- Remove all Mongoose model imports.

#### 4c — Update DI wiring

### Acceptance Criteria
- No Mongoose imports in `serverService.ts`.
- `deleteWithRelated` transaction is tested at the repository level.
- Unit tests for `ServerService` use mocked repositories.

---

## Phase 5 — `channelRepository` & `channelService` + `channelMessageService`

**Why together:** Channel messages belong to channels; the two repositories
share a natural boundary and are both needed by `channelService`.

### Tasks

#### 5a — Create `ChannelRepository`

File: `src/repositories/channelRepository.ts`

```ts
interface ChannelRepository {
  findById(id: string): Promise<ChannelEntity | null>;
  findByServerId(serverId: string): Promise<ChannelEntity[]>;
  create(data: CreateChannelData): Promise<ChannelEntity>;
  update(id: string, data: Partial<UpdateChannelData>): Promise<ChannelEntity | null>;
  deleteById(id: string): Promise<void>;
}
```

#### 5b — Create `ChannelMessageRepository`

File: `src/repositories/channelMessageRepository.ts`

```ts
interface ChannelMessageRepository {
  findById(id: string): Promise<ChannelMessageEntity | null>;
  findByChannelId(channelId: string, limit?: number): Promise<ChannelMessageEntity[]>;
  create(data: CreateChannelMessageData): Promise<ChannelMessageEntity>;
  deleteById(id: string): Promise<void>;
}
```

#### 5c — Refactor `channelService.ts`

- Convert to a class `ChannelService`.
- Constructor: `(private channel: ChannelRepository, private server: ServerRepository)`.
- Remove all Mongoose model imports.

#### 5d — Refactor `channelMessageService.ts`

- Convert to a class `ChannelMessageService`.
- Constructor: `(private channelMessage: ChannelMessageRepository, private channel: ChannelRepository, private user: UserRepository)`.
- Remove all Mongoose model imports.

#### 5e — Update DI wiring

### Acceptance Criteria
- No Mongoose imports in either service.
- Unit tests for both services use mocked repositories.

---

## Phase 6 — `storageService`

**Why last:** `storageService` is likely a thin wrapper around the
`FileStorage` infrastructure adapter. It may not need a repository at all —
confirm first.

### Tasks

1. **Read `storageService.ts`** and identify any direct Mongoose / model calls.
2. If DB calls exist (e.g., persisting file metadata), extract them into the
   appropriate existing repository (most likely `UserRepository` or a new
   `FileMetadataRepository`).
3. If `storageService` only wraps `FileStorage`, convert it to a class that
   takes `FileStorage` in its constructor and remove any stray model imports.
4. Update DI wiring.

### Acceptance Criteria
- `storageService.ts` has zero Mongoose imports.
- Any metadata persistence is delegated to a repository.

---

## Phase 7 — Final Cleanup & Verification

### Tasks

1. **Global grep** — confirm zero remaining `import mongoose` or
   `import … from "../models/` in any file under `src/services/` or
   `src/socketServices/`.

   ```bash
   grep -rn "from \"mongoose\"\|from '../models/" src/services src/socketServices
   ```

2. **DI audit** — verify every service class is instantiated with real
   repository implementations (not the interface type) in `app.ts` or the
   relevant bootstrap file.

3. **Run full test suite** — `pnpm test`. All pre-existing tests must pass.

4. **Add missing unit tests** — every service method introduced or changed in
   Phases 2–6 must have at least one happy-path and one error-path test using
   mocked repositories.

5. **PR checklist** (from `CODING_GUIDELINES.md §10`):
   - [ ] Input validation at boundaries
   - [ ] No database access in controllers or socket handlers
   - [ ] Authorization logic in services
   - [ ] Typed errors only
   - [ ] Unit tests for new business logic
   - [ ] No unused exports or dead code

---

## Dependency Graph

```
Phase 1 (entities + withTransaction)
    │
    ├── Phase 2 (UserRepository → authService, userService, profileService)
    │
    ├── Phase 3 (ChatRepository → chatService)          depends on Phase 2 (UserRepository)
    │
    ├── Phase 4 (ServerRepository → serverService)      depends on Phase 2 (UserRepository)
    │
    ├── Phase 5 (ChannelRepository + ChannelMessageRepository → channelService, channelMessageService)
    │                                                   depends on Phase 4 (ServerRepository)
    │
    └── Phase 6 (storageService)                        independent; can run in parallel with 2–5
            │
            └── Phase 7 (cleanup + verification)
```

Phases 2, 3, 4, and 6 can be worked on in parallel once Phase 1 is complete.
Phase 5 must wait for Phase 4 (`ServerRepository` is needed by
`ChannelService`).

---

## Out of Scope

- `chatMessageAttachmentService` — already compliant; do not modify.
- Frontend / socket event payloads — no changes to the public API surface.
- Database schema / Mongoose models — repositories wrap them; models themselves
  are not changed.
