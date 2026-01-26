# Coding Guidelines – Discord Clone Backend

These guidelines define **how code is structured, written, and reviewed** in this project. They focus on **architecture, responsibilities, and correctness**, not formatting (see `STYLE_GUIDELINES.md`).

The goal is to keep the codebase **predictable, testable, and safe**, even as the project grows.

---

## 1. Core Principles

* **Single Responsibility** – each file/class does one thing
* **Clear boundaries** – HTTP, business logic, and data access are separated
* **Explicit validation** – never trust external input
* **Testable by default** – business logic must be unit-testable
* **Fail loudly and early** – invalid state should not propagate

---

## 2. Project Structure

```
src/
  controllers/        // HTTP only (Express)
  routes/             // Route definitions
  services/           // Business logic + authorization
  repositories/       // Database access (Mongoose)
  models/             // Mongoose schemas
  infrastructure/     // External adapters (storage, queues, third-party clients)
  socketHandlers/     // Socket.IO event wiring (thin)
  socketServices/     // Socket business logic
  middleware/         // Auth, rate limit, error handling
  utils/              // Pure helper functions
  types/              // DTOs, shared interfaces, request extensions
  config/             // Env, logging, external clients
```

### Data Shapes

* **Models** — persistence layer shapes (Mongoose schemas/documents) that mirror the database.
* **Entities** — in-app domain types used inside services/logic; keep them persistence-agnostic.
* **DTOs** — boundary contracts for HTTP/Socket: what we accept and return via the API.

Keep conversions explicit (e.g., model ⇄ entity ⇄ DTO) using dedicated mappers/helpers.

### Placement rules

* If it touches **Express req/res** → `controller` or `middleware`
* If it decides **business logic** → `service`
* If it touches **DB** → `repository`
* If it is **pure logic** → `utils`

---

## 3. Layer Responsibilities

### Controllers (HTTP Layer)

**Responsibilities**

1. Parse & validate input (Zod)
2. Call exactly **one** service method
3. Send HTTP response

**Must not**

* Access repositories or Mongoose
* Contain authorization logic
* Contain business rules

**Example**

```ts
export async function deleteMessage(req: Request, res: Response) {
  const input = deleteMessageSchema.parse({
    userId: req.userId,
    messageId: req.params.messageId,
  });

  await messageService.deleteMessage(input);

  res.status(204).send();
}
```

---

### Services (Business Logic Layer)

**Responsibilities**

* Authorization & permission checks
* Business rules & invariants
* Orchestration of repositories and external services
* Transaction coordination (if needed)

**Must not**

* Parse Express `req` / `res`
* Return HTTP responses
* Know about routing or sockets

**Guideline**

* Services are **classes** when they hold dependencies
* Dependencies are injected via constructor

---

### Repositories (Data Access Layer)

**Responsibilities**

* Encapsulate all database access
* Hide Mongoose queries and models
* Return consistent data shapes

**Must not**

* Perform authorization
* Throw HTTP-specific errors
* Depend on Express or Socket.IO

---

## 4. Validation Rules

### Boundary validation is mandatory

All external input must be validated at the boundary:

* HTTP body / params / query
* Socket.IO payloads
* Environment variables

### `parse*` helpers

If a value can be `undefined` or invalid (e.g. `req.userId`), it must be explicitly parsed.

```ts
export function parseUserId(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new UnauthorizedError("Missing userId");
  }
  return value;
}
```

Never cast (`as string`) without validation.

---

## 5. Error Handling

### Rules

* Services throw **typed domain errors**
* Controllers do not catch errors unless adding context
* Global error middleware maps errors to HTTP responses

### Error mapping

| Error Type        | HTTP Status |
| ----------------- | ----------- |
| ZodError          | 400         |
| UnauthorizedError | 401         |
| ForbiddenError    | 403         |
| NotFoundError     | 404         |
| Unknown           | 500         |

---

## 6. Socket.IO Guidelines

Socket handlers follow the same structure as controllers.

**Responsibilities**

1. Validate payload (Zod)
2. Call socket service
3. Emit events

**Must not**

* Access repositories directly
* Contain business rules

**Example**

```ts
socket.on("message:send", async (payload) => {
  const input = sendMessageSchema.parse({
    ...payload,
    userId: socket.data.userId,
  });

  const message = await socketMessageService.sendMessage(input);
  io.to(input.chatId).emit("message:new", message);
});
```

---

## 7. Naming Conventions

### General

* Use explicit names over short names
* IDs are always named `userId`, `chatId`, `messageId`

### Functions

* `createMessage`
* `deleteMessageAttachment`

### Services

* `MessageService`
* `ChatService`

### DTOs

* `CreateMessageInput`
* `MessageDTO`

---

## 8. Testing Guidelines (Vitest)

### What to test

* **Services** → unit tests (mock repositories)
* **Repositories** → integration tests (test DB)
* **Controllers** → minimal integration tests

### Test naming

```ts
it("should delete message when sender", () => {})
it("should throw forbidden when not participant", () => {})
```

---

## 9. Logging & Auditing

### Rules

* Logging is **contextual**, not noisy
* Business-relevant actions are audited in services
* Controllers do not perform audit logic

Audit calls should be **non-blocking** and must not affect main execution flow.

---

## 10. Pull Request Checklist

Every PR must satisfy:

* [ ] Input validation at boundaries
* [ ] No database access in controllers or socket handlers
* [ ] Authorization logic in services
* [ ] Typed errors only
* [ ] Unit tests for new business logic
* [ ] No unused exports or dead code

---

## 11. Guideline Philosophy

> **If ESLint can enforce it → Style guideline**
> **If a human must review it → Coding guideline**

---

## 12. How to Apply This Document

1. **Before coding** – choose the right layer (controller/service/repository) and the right folder from the structure above.
2. **While coding** – enforce validation at the boundary, push decisions into services, and keep data access in repositories.
3. **Before PR** – walk through the checklist in §10, run `pnpm build` and `pnpm test`, and ensure audit/log calls have context.
4. **During review** – comment first on correctness, security, and boundaries; only then on style and micro-optimizations.
5. **After merge** – monitor logs for regressions and tighten tests where incidents occurred.
