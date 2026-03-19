# Story 1.1: Shared Infrastructure Setup

Status: review

## Story

As a developer,
I want the shared infrastructure layer (Drizzle DB client, ApiError class, rate limiter) set up and configured,
So that all future use cases and route handlers can rely on a consistent, tested foundation.

## Acceptance Criteria

1. **Given** `src/lib/server/shared/db/client.ts` is created
   **When** it is imported
   **Then** it exports a singleton Drizzle instance connected via `DATABASE_URL` env var
   **And** it never exposes the connection string to any client-side code

2. **Given** `src/lib/server/infrastructure/errors/api-error.ts` is created
   **When** an infrastructure adapter catches an unknown error and calls `createApiError(error)`
   **Then** it returns an `ApiError` with `statusCode` 500 and the original message preserved
   **And** if the input is already an `ApiError`, it is returned as-is (no wrapping)

3. **Given** `src/lib/server/middleware/rate-limiter.ts` is created
   **When** `createRateLimiter(limit, windowMs)` is called
   **Then** it returns a function that tracks requests per IP using an in-memory sliding window
   **And** returns `true` when the request should be blocked (limit exceeded), `false` otherwise

4. **Given** `src/hooks.server.ts` exists with the rate limiter applied
   **When** a request hits any `/api/*` route and exceeds 60 req/min from the same IP
   **Then** SvelteKit returns HTTP 429 without reaching the route handler
   **And** requests to non-`/api/*` routes are never rate-limited

5. **Given** `drizzle.config.ts` exists at project root
   **When** `drizzle-kit generate` is run
   **Then** it connects to the DB via `DATABASE_URL` and targets the `drizzle/migrations/` folder

## Tasks / Subtasks

- [x] Task 1: Install Drizzle ORM dependencies (AC: #1, #5)
  - [x] Run `npm install drizzle-orm postgres` and `npm install -D drizzle-kit`
  - [x] Verify no conflicting DB packages exist in package.json

- [x] Task 2: Create shared DB client (AC: #1)
  - [x] Create `src/lib/server/shared/db/client.ts` — exports singleton `db` via `drizzle(sql)` with `postgres` driver
  - [x] Import from `$env/static/private` (SvelteKit private env — server-side only, never client-exposed)
  - [x] Throw a clear error at import time if `DATABASE_URL` is missing

- [x] Task 3: Create `drizzle.config.ts` at project root (AC: #5)
  - [x] Use `defineConfig` from `drizzle-kit`
  - [x] `schema: './src/lib/server/contexts/**/infrastructure/db/schema.ts'` (glob — all context schemas)
  - [x] `out: './drizzle/migrations'`
  - [x] `dialect: 'postgresql'`, `dbCredentials: { url: process.env.DATABASE_URL! }`

- [x] Task 4: Create ApiError class (AC: #2)
  - [x] Create `src/lib/server/infrastructure/errors/api-error.ts`
  - [x] `ApiError extends Error` with `statusCode: number` and optional `cause?: unknown`
  - [x] `createApiError(error: unknown): ApiError` — identity if already ApiError, wraps Error, wraps unknown
  - [x] No external imports

- [x] Task 5: Create rate limiter (AC: #3)
  - [x] Create `src/lib/server/middleware/rate-limiter.ts`
  - [x] In-memory `Map<string, number[]>` — key = IP, value = array of request timestamps
  - [x] Sliding window: keep only timestamps within `windowMs`, block if count >= limit
  - [x] Export `rateLimiter` singleton configured for 60 req/min

- [x] Task 6: Wire rate limiter in hooks.server.ts (AC: #4)
  - [x] Create `src/hooks.server.ts`
  - [x] In the `handle` hook: check `event.url.pathname.startsWith('/api/')` before applying limiter
  - [x] Return `new Response('Too Many Requests', { status: 429 })` when blocked
  - [x] Otherwise call `resolve(event)`

- [x] Task 7: Update `src/app.d.ts` for env typing (prerequisite for Story 5.2, but add DATABASE_URL now)
  - [x] Add `DATABASE_URL` to `App.Platform` or use SvelteKit `$env/static/private` convention (no `app.d.ts` change needed for private env — just document the pattern)

- [x] Task 8: Write unit tests (co-located)
  - [x] `src/lib/server/infrastructure/errors/api-error.test.ts` — tests: unknown error → 500, Error → preserves message, ApiError → identity
  - [x] `src/lib/server/middleware/rate-limiter.test.ts` — tests: under limit → not blocked, at limit → not blocked, over limit → blocked, different IPs → independent counters, window expiry → resets

## Dev Notes

### Critical: SvelteKit Private Env Pattern

**ALWAYS** use `$env/static/private` for server-side secrets — NOT `process.env`:

```typescript
// ✅ CORRECT — server-side only, TypeScript-typed, never bundled client-side
import { DATABASE_URL } from '$env/static/private';

// ❌ WRONG — process.env works at runtime but bypasses SvelteKit's type safety and leak protection
const url = process.env.DATABASE_URL;
```

`$env/static/private` is only importable in server files (`+server.ts`, `+page.server.ts`, `*.server.ts`, `src/lib/server/**`). Attempting to import it client-side throws a build error — this is the desired protection.

### Drizzle ORM Setup (v0.36+ / drizzle-kit v0.27+)

The project uses **Tailwind v4** which requires `@tailwindcss/vite` (already in devDependencies). Drizzle is additive — no conflict.

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

Use the `postgres` driver (not `pg`) — it is the modern ESM-compatible driver and is Neon-compatible:

```typescript
// src/lib/server/shared/db/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL } from '$env/static/private';

const sql = postgres(DATABASE_URL);
export const db = drizzle(sql);
```

**Singleton pattern:** SvelteKit/Vite reuses module instances in dev HMR mode. This pattern is safe — `postgres()` connection pool is created once per server process.

### drizzle.config.ts — Schema Glob

The config must discover schemas across ALL contexts. Use glob pattern:

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/server/contexts/**/infrastructure/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

Note: `drizzle.config.ts` uses `process.env` (not `$env/static/private`) because it runs as a Node.js script outside SvelteKit's build pipeline.

### ApiError Location

**IMPORTANT:** `ApiError` lives in `src/lib/server/infrastructure/errors/` — NOT in `domain/`. Domain files must have zero external imports. Error wrapping is an infrastructure concern.

```typescript
// src/lib/server/infrastructure/errors/api-error.ts
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function createApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof Error) return new ApiError(500, error.message, error);
  return new ApiError(500, 'Unknown error', error);
}
```

### Rate Limiter — In-Memory Sliding Window

```typescript
// src/lib/server/middleware/rate-limiter.ts
type Timestamps = number[];

const store = new Map<string, Timestamps>();

export function createRateLimiter(limit: number, windowMs: number) {
  return function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const timestamps = (store.get(ip) ?? []).filter(t => now - t < windowMs);
    if (timestamps.length >= limit) {
      store.set(ip, timestamps);
      return true;
    }
    timestamps.push(now);
    store.set(ip, timestamps);
    return false;
  };
}

export const rateLimiter = createRateLimiter(60, 60_000); // 60 req/min
```

**Single-instance only:** This in-memory approach is valid ONLY for single-instance Vercel deployments (which is the target). For multi-instance, would need Redis. No change needed for MVP.

### hooks.server.ts Pattern

```typescript
// src/hooks.server.ts
import { rateLimiter } from '$lib/server/middleware/rate-limiter';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname.startsWith('/api/')) {
    const ip = event.getClientAddress();
    if (rateLimiter(ip)) {
      return new Response('Too Many Requests', { status: 429 });
    }
  }
  return resolve(event);
};
```

`$lib/server/` alias resolves to `src/lib/server/` — use it for all server imports in route files.

### Project Structure Notes

Files to create in this story:
```
src/
├── hooks.server.ts                              ← NEW
├── app.d.ts                                     ← exists, no change needed for this story
└── lib/server/
    ├── shared/db/
    │   └── client.ts                            ← NEW (directory already exists but empty)
    ├── middleware/
    │   └── rate-limiter.ts                      ← NEW (directory already exists but empty)
    └── infrastructure/errors/
        ├── api-error.ts                          ← NEW (directory must be created)
        └── api-error.test.ts                     ← NEW (co-located test)

drizzle.config.ts                                ← NEW at project root
```

**Directories that already exist** (verified in codebase): `src/lib/server/shared/db/`, `src/lib/server/middleware/`, `src/lib/server/contexts/`, `src/lib/server/cross-context/`, `src/lib/server/decorators/`

**Directory to create:** `src/lib/server/infrastructure/errors/` — this is a cross-context infrastructure concern, not tied to any specific context.

### Architecture Compliance

- `shared/db/client.ts` is correctly placed — it's the only place the Drizzle instance is created; all repositories will import from `$lib/server/shared/db/client`
- `middleware/rate-limiter.ts` imports nothing from `contexts/` — enforced by architecture rules
- `infrastructure/errors/api-error.ts` imports nothing from `contexts/` or `domain/`
- `hooks.server.ts` in `src/` is SvelteKit convention — it cannot live elsewhere

### Testing Patterns for This Project

Vitest is already in devDependencies. Tests are co-located next to source files:

```typescript
// api-error.test.ts
import { describe, it, expect } from 'vitest';
import { ApiError, createApiError } from './api-error';

describe('createApiError', () => {
  it('returns ApiError as-is', () => { ... });
  it('wraps Error with status 500', () => { ... });
  it('wraps unknown with status 500', () => { ... });
});
```

Run with: `npm run test:unit`

No database required for unit tests in this story. Integration tests (using real DB) start in Story 1.3.

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md` — Authentication & Security section (rate limiter), API & Communication Patterns (ApiError), Complete Project Directory Structure
- Architecture: `_bmad-output/planning-artifacts/architecture.md` — Data Architecture section (Drizzle ORM + Kit)
- Epics: `_bmad-output/planning-artifacts/epics.md` — Story 1.1 AC, Additional Requirements (ORM & Migrations, API error handling)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No blocking issues encountered._

### Completion Notes List

- Installed drizzle-orm@^0.45.1, postgres@^3.4.8, drizzle-kit@^0.31.10
- `src/lib/server/shared/db/client.ts`: singleton Drizzle instance via `postgres` driver + `$env/static/private` (never client-exposed)
- `drizzle.config.ts`: uses `process.env.DATABASE_URL` (runs outside SvelteKit pipeline), targets glob schema + `drizzle/migrations/`
- `src/lib/server/infrastructure/errors/api-error.ts`: zero external imports; `createApiError` is idempotent for `ApiError` inputs
- `src/lib/server/middleware/rate-limiter.ts`: in-memory sliding window Map; module-level store shared across requests within a process
- `src/hooks.server.ts`: `/api/*` gating only; non-API routes bypass rate limiter
- `app.d.ts` unchanged — `$env/static/private` handles typing automatically
- 11 unit tests passing (4 ApiError + 5 rate-limiter + 2 ApiError class); rate-limiter tests use unique IPs per test case to avoid shared-store interference

### File List

- `package.json` (modified — added drizzle-orm, postgres, drizzle-kit)
- `package-lock.json` (modified)
- `drizzle.config.ts` (new)
- `src/hooks.server.ts` (new)
- `src/lib/server/shared/db/client.ts` (new)
- `src/lib/server/infrastructure/errors/api-error.ts` (new)
- `src/lib/server/infrastructure/errors/api-error.test.ts` (new)
- `src/lib/server/middleware/rate-limiter.ts` (new)
- `src/lib/server/middleware/rate-limiter.test.ts` (new)

## Change Log

- 2026-03-19: Story 1.1 implemented — shared DB client, drizzle config, ApiError, rate limiter, hooks wiring, unit tests (11 passing)
