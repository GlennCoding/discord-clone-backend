# Style Guidelines – Discord Clone Backend

These guidelines define **how code should look and feel** across the codebase. They focus on **consistency, readability, and automation**.

> Architectural and responsibility rules live in `CODING_GUIDELINES.md`.

Where possible, these rules are **enforced automatically** via ESLint, Prettier, and TypeScript.

---

## 1. Guiding Principles

* **Consistency beats preference**
* **Readability over cleverness**
* **Automation over manual enforcement**
* **Explicit over implicit**

If a rule can be automated, it should be.

---

## 2. Tooling (Source of Truth)

The following tools are authoritative:

* **TypeScript** – type correctness
* **ESLint** – code quality & anti-patterns
* **Prettier** – formatting

Manual formatting changes should never be requested in PRs.

---

## 3. Formatting Rules (Prettier)

Formatting is fully handled by Prettier.

### Core rules

* 2 spaces indentation
* Max line length: 100
* Trailing commas where valid
* Semicolons enabled
* Single quotes for strings

Developers must not rely on personal editor settings.

---

## 4. File & Folder Naming

### Files

* `camelCase.ts` for utilities and services
* `kebab-case.ts` for route files
* Test files: `*.test.ts`

### Folders

* `camelCase` only
* Singular names (`service`, not `servicesV2`)

---

## 5. TypeScript Style Rules

### General

* `strict: true` must remain enabled
* Avoid `any`; use `unknown` when needed
* Never suppress errors with `@ts-ignore`

### Types vs Interfaces

* Use `type` for unions and DTOs
* Use `interface` only when extension is required

### Explicit return types

* Required for public service methods
* Optional for private helpers

```ts
public async deleteMessage(input: DeleteMessageInput): Promise<void> {}
```

---

## 6. Imports & Exports

### Import order

1. Node built-ins
2. External libraries
3. Internal absolute imports
4. Relative imports

Separated by a single empty line.

### Exports

* Prefer **named exports**
* Avoid default exports

---

## 7. Naming Conventions

### Variables

* `camelCase`
* Descriptive names (`participantIds` > `ids`)

### Constants

* `UPPER_SNAKE_CASE`

### Booleans

* Prefix with `is`, `has`, `can`, `should`

```ts
const isParticipant = true;
const hasPermission = false;
```

---

## 8. Functions & Methods

* Keep functions short (< 30 lines preferred)
* Avoid deep nesting (> 3 levels)
* Prefer early returns

Bad:

```ts
if (condition) {
  if (otherCondition) {
    doThing();
  }
}
```

Good:

```ts
if (!condition || !otherCondition) return;

doThing();
```

---

## 9. Comments & Documentation

### Rules

* Code should explain **how**, comments explain **why**
* Avoid redundant comments
* Use JSDoc only for public APIs

Bad:

```ts
// increments i
 i++;
```

Good:

```ts
// Messages are soft-deleted to preserve chat history integrity
```

---

## 10. Error Style

* Errors must be explicit and typed
* Error messages must be user-safe and actionable
* Do not expose internal details

Bad:

```ts
throw new Error("Something broke");
```

Good:

```ts
throw new ForbiddenError("You are not allowed to delete this message");
```

---

## 11. Testing Style

### Structure

* Arrange – Act – Assert pattern
* One expectation per test when possible

```ts
describe("deleteMessage", () => {
  it("should delete message when sender", async () => {
    // arrange
    // act
    // assert
  });
});
```

### Mocks

* Prefer explicit mocks over implicit globals

---

## 12. Git & PR Style

### Commits

* Small, focused commits
* Imperative mood

Examples:

* `add message deletion authorization`
* `fix socket payload validation`

### Pull Requests

* One logical change per PR
* No formatting-only PRs

---

## 13. When in Doubt

> Make the code **boring, obvious, and readable**.

If a reviewer has to ask what the code does, it needs to be rewritten.
