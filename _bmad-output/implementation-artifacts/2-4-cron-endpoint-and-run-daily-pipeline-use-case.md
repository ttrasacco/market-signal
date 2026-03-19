# Story 2.4: Cron endpoint & RunDailyPipelineUseCase — wiring & scheduling

Status: review

## Story

As a developer,
I want the `GET /api/cron/daily` endpoint wired to `RunDailyPipelineUseCase` and configured in `vercel.json`,
so that Vercel Cron triggers the full pipeline autonomously every day without manual intervention.

## Acceptance Criteria

1. **Given** `vercel.json` contains a cron entry
   **When** the schedule fires
   **Then** Vercel calls `GET /api/cron/daily` with `Authorization: Bearer $CRON_SECRET`

2. **Given** the cron endpoint receives a request
   **When** the `Authorization` header is missing or incorrect
   **Then** it returns HTTP 401 without executing the pipeline

3. **Given** a valid cron request is received
   **When** `RunDailyPipelineUseCase.execute()` runs
   **Then** it calls `IngestNewsUseCase.execute()` and logs `[PIPELINE] ingest: X articles fetched, Y impacts stored`
   **And** returns HTTP 200 with a JSON summary `{ articlesIngested: number, impactsStored: number }`

4. **Given** the pipeline throws an unhandled error
   **When** the cron endpoint catches it
   **Then** it logs `[PIPELINE] error: <message>` and returns HTTP 500 — the next cron invocation will retry

## Tasks / Subtasks

- [x] Task 1: Create `RunDailyPipelineUseCase` in `cross-context/pipeline/application/` (AC: #3, #4)
    - [x] Create directory `src/lib/server/cross-context/pipeline/application/`
    - [x] File: `src/lib/server/cross-context/pipeline/application/run-daily-pipeline.use-case.ts`
    - [x] Constructor: `(ingestNewsUseCase: IngestNewsUseCase)` — injected, not instantiated inside
    - [x] `execute()` calls `ingestNewsUseCase.execute()`, logs `[PIPELINE] ingest: X articles fetched, Y impacts stored`
    - [x] Returns `{ articlesIngested: number; impactsStored: number }` — re-exposes `IngestNewsResult`
    - [x] On unhandled error: logs `[PIPELINE] error: <message>`, re-throws so caller can return HTTP 500

- [x] Task 2: Create `cron-handler.ts` in `cross-context/pipeline/interface/` (AC: #2, #3, #4)
    - [x] Create directory `src/lib/server/cross-context/pipeline/interface/`
    - [x] File: `src/lib/server/cross-context/pipeline/interface/cron-handler.ts`
    - [x] Export `handleCronRequest(request: Request, useCase: RunDailyPipelineUseCase): Promise<Response>`
    - [x] Validate `Authorization: Bearer ${CRON_SECRET}` header — return `Response` 401 if invalid
    - [x] Call `useCase.execute()`, return `Response` 200 with `{ articlesIngested, impactsStored }`
    - [x] Catch unhandled errors: log `[PIPELINE] error: <message>`, return `Response` 500 with `{ error }`
    - [x] Import `CRON_SECRET` from `$env/static/private`

- [x] Task 3: Create `GET /api/cron/daily` route handler (AC: #2, #3, #4)
    - [x] File: `src/routes/api/cron/daily/+server.ts` (directory `src/routes/api/cron/daily/` already exists as a folder — create the file)
    - [x] Instantiate: `DrizzleNewsImpactRepository`, `AnthropicClassifier`, `RssFetcher`, then `IngestNewsUseCase`, then `RunDailyPipelineUseCase`
    - [x] Delegate to `handleCronRequest(event.request, pipeline)`
    - [x] Exported `GET` handler only — Vercel Cron uses GET

- [x] Task 4: Create `vercel.json` at project root (AC: #1)
    - [x] File: `vercel.json`
    - [x] Cron schedule: `0 6 * * *` (runs daily at 06:00 UTC)
    - [x] Path: `/api/cron/daily`
    - [x] No hardcoded secrets

## Dev Notes

### File Locations — What Exists vs What to Create

```
src/lib/server/
├── cross-context/                              ← directory does NOT exist yet — create it
│   └── pipeline/
│       ├── application/
│       │   └── run-daily-pipeline.use-case.ts  ← CREATE NEW
│       └── interface/
│           └── cron-handler.ts                 ← CREATE NEW
├── contexts/
│   └── news/
│       ├── application/
│       │   └── use-cases/
│       │       └── ingest-news.use-case.ts     ← DONE (Story 2.3) — import, do not touch
│       └── infrastructure/
│           ├── db/
│           │   └── news-impact.repository.ts   ← DONE — import for wiring
│           ├── llm/
│           │   └── anthropic-classifier.ts     ← DONE (Story 2.2) — import for wiring
│           └── rss/
│               └── rss-fetcher.ts              ← DONE (Story 2.1) — import for wiring
└── shared/
    └── db/
        └── client.ts                           ← DONE — import db singleton

src/routes/
└── api/
    └── cron/
        └── daily/                              ← directory exists (empty)
            └── +server.ts                      ← CREATE NEW

vercel.json                                     ← CREATE NEW at project root
```

**Do NOT touch:** any file under `contexts/` — they are complete from Epic 1–2.3.

### Architecture Rule: cross-context/pipeline Ownership

Per architecture, `RunDailyPipelineUseCase` lives in `cross-context/pipeline/` because it orchestrates across multiple domain contexts (in this story: just `news/`, but Epic 3 will add `scoring/`). This location is mandated even if the current implementation only calls one use case.

**Dependency rule for cross-context:**

- `cross-context/pipeline/application/` MAY import from `contexts/news/application/use-cases/`
- `cross-context/pipeline/interface/` handles HTTP wiring only, imports from `application/` layer above
- `src/routes/api/cron/daily/+server.ts` (interface/routes layer) does all concrete instantiation

### RunDailyPipelineUseCase — Exact Implementation

```typescript
// src/lib/server/cross-context/pipeline/application/run-daily-pipeline.use-case.ts
import type {
    IngestNewsUseCase,
    IngestNewsResult
} from '../../../../contexts/news/application/use-cases/ingest-news.use-case';

export interface RunDailyPipelineResult {
    articlesIngested: number;
    impactsStored: number;
}

export class RunDailyPipelineUseCase {
    constructor(private readonly ingestNewsUseCase: IngestNewsUseCase) {}

    async execute(): Promise<RunDailyPipelineResult> {
        try {
            const result: IngestNewsResult = await this.ingestNewsUseCase.execute();
            // IngestNewsUseCase already logs [PIPELINE] ingest: X articles fetched, Y impacts stored
            return {
                articlesIngested: result.articlesIngested,
                impactsStored: result.impactsStored
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[PIPELINE] error: ${message}`);
            throw error; // re-throw so cron-handler returns HTTP 500
        }
    }
}
```

**Critical notes:**

- `IngestNewsUseCase.execute()` does NOT throw on per-article/per-feed errors (it catches internally) — only truly unhandled exceptions reach the `catch` here
- `IngestNewsUseCase` is imported by class reference, not by interface — it IS the dependency here
- Do not log `[PIPELINE] ingest:` again here — it is already logged inside `IngestNewsUseCase`

### cron-handler.ts — Exact Implementation

```typescript
// src/lib/server/cross-context/pipeline/interface/cron-handler.ts
import { CRON_SECRET } from '$env/static/private';
import type { RunDailyPipelineUseCase } from '../application/run-daily-pipeline.use-case';

export async function handleCronRequest(
    request: Request,
    useCase: RunDailyPipelineUseCase
): Promise<Response> {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const result = await useCase.execute();
        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        // [PIPELINE] error: message already logged in RunDailyPipelineUseCase
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
```

**Why `$env/static/private` in interface/ and not in application/?**
Interface layer is the only place that touches SvelteKit-specific env imports. Application layer stays framework-agnostic. This is correct hexagonal layering.

### +server.ts Route — Exact Wiring Pattern

```typescript
// src/routes/api/cron/daily/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { ANTHROPIC_API_KEY, DATABASE_URL } from '$env/static/private';
import { db } from '$lib/server/shared/db/client';
import { DrizzleNewsImpactRepository } from '$lib/server/contexts/news/infrastructure/db/news-impact.repository';
import { AnthropicClassifier } from '$lib/server/contexts/news/infrastructure/llm/anthropic-classifier';
import { RssFetcher } from '$lib/server/contexts/news/infrastructure/rss/rss-fetcher';
import { IngestNewsUseCase } from '$lib/server/contexts/news/application/use-cases/ingest-news.use-case';
import { RunDailyPipelineUseCase } from '$lib/server/cross-context/pipeline/application/run-daily-pipeline.use-case';
import { handleCronRequest } from '$lib/server/cross-context/pipeline/interface/cron-handler';

const FEED_URLS = [
    'https://feeds.reuters.com/reuters/businessNews',
    'https://feeds.a.dj.com/rss/RSSMarketsMain.xml'
];

export const GET: RequestHandler = async ({ request }) => {
    const repository = new DrizzleNewsImpactRepository(db);
    const classifier = new AnthropicClassifier(ANTHROPIC_API_KEY);
    const fetcher = new RssFetcher();
    const ingestUseCase = new IngestNewsUseCase(fetcher, classifier, repository, FEED_URLS);
    const pipeline = new RunDailyPipelineUseCase(ingestUseCase);

    return handleCronRequest(request, pipeline);
};
```

**Wiring rules:**

- `DATABASE_URL` is used via `db` singleton already — no need to pass it directly; import `db` from shared client
- `ANTHROPIC_API_KEY` passed directly to `AnthropicClassifier` constructor (confirmed: `constructor(apiKey: string)`)
- `RssFetcher` constructor takes no arguments (confirmed from Story 2.1)
- `DrizzleNewsImpactRepository` constructor: check actual signature — it likely takes `db`
- Do NOT import `DATABASE_URL` if not needed; the `db` singleton already handles connection

**Feed URLs:** Provide at least 2 real RSS feeds as initial config. These are hardcoded constants in the route file for MVP — no DB config table needed.

### vercel.json — Required Structure

```json
{
    "crons": [
        {
            "path": "/api/cron/daily",
            "schedule": "0 6 * * *"
        }
    ]
}
```

**Schedule logic:** `0 6 * * *` = 06:00 UTC daily. This ensures the pipeline runs after European/Asian market news has settled overnight, before US markets open.

**Vercel Cron authentication:** Vercel automatically injects `Authorization: Bearer $CRON_SECRET` on scheduled calls. No additional config needed in `vercel.json`.

### Verify DrizzleNewsImpactRepository Constructor

Before implementing `+server.ts`, read `src/lib/server/contexts/news/infrastructure/db/news-impact.repository.ts` to confirm the constructor signature. Expected pattern: `constructor(private db: DrizzleDb)` — pass the shared `db` instance. Do not assume.

### Security Checklist

- ✅ `CRON_SECRET` validated in `cron-handler.ts` before any pipeline execution
- ✅ `ANTHROPIC_API_KEY` and `DATABASE_URL` sourced from `$env/static/private` — server-only, never client-exposed
- ✅ `vercel.json` contains no secrets — only path and schedule
- ✅ HTTP 401 returned without error details on auth failure (no info leak)

### Error Flow Summary

```
Vercel Cron → GET /api/cron/daily
  → +server.ts: instantiate adapters + use cases
  → handleCronRequest(): validate CRON_SECRET
    → 401 if invalid (no pipeline execution)
    → RunDailyPipelineUseCase.execute()
      → IngestNewsUseCase.execute()
        per-feed error → console.error + continue (does NOT propagate)
        per-article error → console.error + continue (does NOT propagate)
        → returns { articlesIngested, impactsStored }
      → logs nothing extra (IngestNewsUseCase already logged)
      → returns result
    → 200 { articlesIngested, impactsStored }
    unhandled error → console.error [PIPELINE] error: msg → 500 { error: msg }
```

### Logging Convention

- `[PIPELINE] ingest: X articles fetched, Y impacts stored` — logged by `IngestNewsUseCase` (do not duplicate)
- `[PIPELINE] error: <message>` — logged by `RunDailyPipelineUseCase` on unhandled exception only
- All logs visible in Vercel function logs dashboard

### SvelteKit Route Pattern

SvelteKit `+server.ts` handlers must export named functions matching HTTP methods: `GET`, `POST`, etc. For cron:

- Export `export const GET: RequestHandler = async ({ request }) => { ... }`
- `event.request` gives access to the raw `Request` object — needed to read `Authorization` header

### Project Structure Notes

- Hexagonal architecture: `cross-context/pipeline/` is a valid new bounded context — create all subdirectories
- `interface/` directory under `pipeline/` is correct per architecture doc (mirrors `contexts/news/infrastructure/`)
- `vercel.json` at project root is standard Vercel config — check if it already exists before creating
- No tests required for this story (cron handler is integration-tested via the full pipeline in production; unit testing `handleCronRequest` would require mocking SvelteKit env which adds complexity without value for MVP)

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md` — Cross-Context Use Case Pattern, Cron strategy, Dependency Injection
- Epics: `_bmad-output/planning-artifacts/epics.md` — Story 2.4, Epic 2
- Story 2.3 (previous): `_bmad-output/implementation-artifacts/2-3-ingest-news-use-case.md` — `IngestNewsUseCase` implementation, `IngestNewsResult` type
- Story 2.2: `src/lib/server/contexts/news/infrastructure/llm/anthropic-classifier.ts` — `AnthropicClassifier(apiKey: string)` constructor
- Story 1.1: `src/lib/server/shared/db/client.ts` — `db` singleton pattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Used `$lib/server/...` alias instead of relative path in `run-daily-pipeline.use-case.ts` (relative path failed TS resolution from cross-context dir)
- `DrizzleNewsImpactRepository` has no constructor args (uses `db` via direct import) — `new DrizzleNewsImpactRepository()` in route
- Removed unused `db` import from `+server.ts` (repository handles it internally)

### Completion Notes List

- All 4 tasks implemented, TypeScript clean, 55 tests pass (no regressions)
- `RunDailyPipelineUseCase` orchestrates `IngestNewsUseCase`, re-throws on unhandled errors
- `cron-handler.ts` validates `CRON_SECRET`, returns 401/200/500 accordingly
- Route wires all adapters, delegates to `handleCronRequest`
- `vercel.json` schedules `GET /api/cron/daily` at 06:00 UTC daily

### File List

- `src/lib/server/cross-context/pipeline/application/run-daily-pipeline.use-case.ts` (new)
- `src/lib/server/cross-context/pipeline/interface/cron-handler.ts` (new)
- `src/routes/api/cron/daily/+server.ts` (new)
- `vercel.json` (new)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated: 2-4 → review)
- `_bmad-output/implementation-artifacts/2-4-cron-endpoint-and-run-daily-pipeline-use-case.md` (updated)
