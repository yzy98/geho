# Repository Guidelines

## Project Structure & Module Organization

Geho is a pnpm/Turborepo TypeScript monorepo. Runtime applications live in `apps/`: `api` (Hono API), `dashboard` (React/Vite UI), and `worker` (BullMQ ingestion jobs). Reusable packages live in `packages/`, including database schema and migrations (`db`), RAG logic (`rag`), queue helpers (`queue`), shared contracts (`shared`), and the embeddable React widget (`widget-react`). Keep package-specific source under `src/`; put API tests in `apps/api/src/tests/` and package tests next to the module they cover (for example, `packages/crypto/src/api-key-encryption.test.ts`).

## Build, Test, and Development Commands

- `pnpm install --frozen-lockfile` installs the locked workspace dependencies.
- `pnpm dev` starts all development tasks through Turbo; scope work with `pnpm --filter @geho/api dev` or `@geho/dashboard`.
- `pnpm build`, `pnpm typecheck`, and `pnpm test` run the corresponding workspace tasks.
- `pnpm --filter @geho/api test` runs API Vitest tests; use the analogous package filter for focused checks.
- `pnpm check` validates formatting and lint rules; `pnpm fix` applies safe automated fixes.
- `pnpm infra:up` starts local Postgres and Redis; use `pnpm infra:check` to verify both services (including pgvector).

## Coding Style & Naming Conventions

Write TypeScript with ESM imports and follow the Biome/Ultracite configuration in `biome.jsonc`; do not manually reformat generated `apps/dashboard/src/routeTree.gen.ts`. Use 2-space indentation, `camelCase` for values and functions, `PascalCase` for React components and types, and kebab-case filenames such as `knowledge-source.ts` and `create-chatbot-form.tsx`. Keep route, service, schema, and query responsibilities separated as established in `apps/api/src/` and `apps/dashboard/src/`.

## Testing Guidelines

Vitest is the test runner. Name tests `*.test.ts` and cover both success and failure paths for changed behavior. Run the closest package test first, then `pnpm test` and `pnpm typecheck` before requesting review. Changes involving database, Redis, or workers should also be verified with the local Docker infrastructure when feasible.

## Commit & Pull Request Guidelines

Use Conventional Commit-style subjects seen in history: `feat(rag): add hybrid retrieval`, `fix: correct token validation`, or `docs(readme): clarify setup`. Keep commits small and imperative. PRs should explain the user-visible or operational impact, link the relevant issue, list validation commands, and include screenshots for dashboard or widget UI changes. Call out schema migrations, environment-variable changes, and reliability tradeoffs explicitly.

## Security & Configuration

Do not commit secrets, provider credentials, or local `.env` values. Treat database migrations and `infra:reset:danger` carefully: the latter removes local Docker volumes.
