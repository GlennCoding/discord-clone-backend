# Repository Guidelines

## Project Structure & Module Organization
- Core TypeScript sources live in `src/`, with `app.ts` and `server.ts` wiring Express, Socket.IO, and DB bootstrapping.
- Domain logic is split into feature folders: `controllers/`, `services/`, `models/`, and `routes/`; keep new modules aligned with this pattern.
- Shared helpers and schemas belong in `utils/`, `types/`, and `config/`. Socket-specific flows reside under `socketHandlers/` and `sockets.ts`.
- Tests live in `src/__tests__` alongside a Vitest setup file; mirror the runtime structure when adding new tests.
- Static assets and public bundles go in `public/`. Avoid mixing build artifacts with checked-in sources—emit compiled code to `dist/` only via the build pipeline.

## Build, Test, and Development Commands
- Install once with `pnpm install` (or `npm install` if pnpm is unavailable).
- `pnpm dev` runs `ts-node-dev` against `src/server.ts` for hot-reload development; ensure MongoDB and the fake GCS emulator are running.
- `pnpm build` compiles TypeScript to `dist/`, while `pnpm start` serves the compiled output.
- `pnpm test` executes the Vitest suite in CI mode; use `pnpm test:watch` during active development and `pnpm coverage` before merging to track regressions.
- Local infrastructure: `docker-compose up -d` provisions MongoDB and the GCS emulator required by storage flows.

## Coding Style & Naming Conventions
- Follow the existing 2-space indentation, single quotes only when template literals are unnecessary, and prefer explicit async/await.
- Use camelCase for variables and functions, PascalCase for classes and interfaces, and SCREAMING_SNAKE_CASE for process-level constants.
- Keep modules cohesive: default exports are rare—favor named exports from feature folders to stay consistent with the current layout.
- Run `pnpm build` before pushing to catch type or lint errors surfaced by `tsc`.

## Testing Guidelines
- Write Vitest specs beside related code under `src/__tests__`, following the `<unit>.test.ts` naming pattern.
- Extend `src/__tests__/setup.ts` for shared fixtures (Mongo memory server, socket clients, etc.).
- Cover new controllers, services, and socket handlers with both positive and failure cases; target meaningful coverage rather than thresholds.
- Run `pnpm test` locally before opening a PR and include coverage summaries for significant features.

## Commit & Pull Request Guidelines
- Commits are imperative and scoped (`fix: Initialise socket server`, `Implement messageController`); use conventional prefixes when they add clarity.
- Group related changes per commit, referencing issues in the body when applicable.
- PRs should describe behavior changes, include reproduction or test notes, and attach screenshots or sample payloads for API/UI mutations.
- Confirm checks pass (tests, build) before requesting review and tag reviewers familiar with the affected modules.
