# Story 3.3: RunDailyPipelineUseCase — scoring step wired

Status: review

## Story

As a developer,
I want `RunDailyPipelineUseCase` extended to call `ComputeDailyScoresUseCase` after ingestion,
so that the daily cron triggers the complete pipeline: ingest → score — in a single autonomous run.

## Acceptance Criteria

1. **Given** `RunDailyPipelineUseCase.execute()` runs
   **When** `IngestNewsUseCase` completes successfully
   **Then** `ComputeDailyScoresUseCase.execute(today)` is called immediately after
   **And** logs `[PIPELINE] scoring: Z sector scores computed` upon completion (already logged inside `ComputeDailyScoresUseCase`)

2. **Given** `IngestNewsUseCase` fails with an unhandled error
   **When** the pipeline catches it
   **Then** `ComputeDailyScoresUseCase` is still attempted (scoring can run on existing event store data)
   **And** both errors are logged independently

3. **Given** the cron endpoint returns its summary
   **When** both steps have run
   **Then** the response includes `{ articlesIngested: number, impactsStored: number, scoresComputed: number }`

## Tasks / Subtasks

- [x] Task 1: Extend `RunDailyPipelineUseCase` to accept and call `ComputeDailyScoresUseCase` (AC: #1, #2, #3)
  - [x] File: `src/lib/server/cross-context/pipeline/application/run-daily-pipeline.use-case.ts` — modify existing
  - [x] Add `computeDailyScoresUseCase: ComputeDailyScoresUseCase` as second constructor parameter
  - [x] Update `RunDailyPipelineResult` interface: add `scoresComputed: number`
  - [x] After ingestion (success or failure), always call `computeDailyScoresUseCase.execute(new Date())`
  - [x] `ComputeDailyScoresUseCase.execute()` returns `void` and already logs `[PIPELINE] scoring: N sector scores computed` — do NOT add another log here
  - [x] Since `execute(date)` returns `void`, `scoresComputed` cannot come from its return value — read `bySector.size` as a count OR change `ComputeDailyScoresUseCase.execute()` to return `{ scoresComputed: number }` (preferred — see Dev Notes)
  - [x] Handle ingest error isolation: wrap `ingestNewsUseCase.execute()` in try/catch, log error, continue to scoring
  - [x] Handle scoring error: if `computeDailyScoresUseCase.execute()` throws, log `[PIPELINE] scoring error: <message>` and re-throw

- [x] Task 2: Update `GET /api/cron/daily` route handler wiring (AC: #3)
  - [x] File: `src/routes/api/cron/daily/+server.ts` — modify existing
  - [x] Import `ComputeDailyScoresUseCase` from scoring use cases
  - [x] Import `DrizzleNewsImpactReadRepository` from scoring infrastructure
  - [x] Import `DrizzleSectorScoreRepository` from scoring infrastructure
  - [x] Instantiate: `DrizzleNewsImpactReadRepository`, `DrizzleSectorScoreRepository`, `ComputeDailyScoresUseCase`
  - [x] Pass `computeDailyScoresUseCase` as second arg to `RunDailyPipelineUseCase`

- [x] Task 3: Update `cron-handler.ts` to forward `scoresComputed` in the response (AC: #3)
  - [x] File: `src/lib/server/cross-context/pipeline/interface/cron-handler.ts`
  - [x] No logic change — result already flows through; response body `{ articlesIngested, impactsStored, scoresComputed }` is returned as-is from `useCase.execute()`

## Dev Notes

### File Map: What Exists vs What to Modify

```
src/lib/server/
├── cross-context/pipeline/
│   ├── application/
│   │   └── run-daily-pipeline.use-case.ts    ⚠️ MODIFY — add scoring step
│   └── interface/
│       └── cron-handler.ts                   ⚠️ MINOR UPDATE — verify scoresComputed flows through
│
├── contexts/scoring/
│   ├── application/
│   │   ├── ports/
│   │   │   ├── sector-score.repository.port.ts   ✅ EXISTS — upsert/findLatest
│   │   │   └── news-impact.read.port.ts           ✅ EXISTS — findAllImpacts
│   │   └── use-cases/
│   │       └── compute-daily-scores.use-case.ts  ✅ EXISTS — execute(date: Date): Promise<void>
│   └── infrastructure/
│       ├── db/
│       │   ├── news-impact.read.repository.ts    ✅ EXISTS — DrizzleNewsImpactReadRepository
│       │   └── sector-score.repository.ts        ✅ EXISTS — DrizzleSectorScoreRepository
│       └── fakes/
│           ├── fake-news-impact-read.repository.ts  ✅ EXISTS
│           └── fake-sector-score.repository.ts      ✅ EXISTS
│
└── contexts/news/application/use-cases/
    └── ingest-news.use-case.ts              ✅ EXISTS — do NOT touch

src/routes/api/cron/daily/
└── +server.ts                               ⚠️ MODIFY — add scoring wiring
```

**Do NOT touch:**
- Any file in `contexts/news/` — Epic 2 complete
- `compute-daily-scores.use-case.ts` — Story 3.1 complete
- `DrizzleNewsImpactReadRepository` / `DrizzleSectorScoreRepository` — no changes needed
- `cron-handler.ts` — only check `scoresComputed` flows through the result object

### Critical Design Decision: `scoresComputed` count

`ComputeDailyScoresUseCase.execute(date: Date): Promise<void>` currently returns `void`. To populate `scoresComputed` in the pipeline result, **change the return type of `execute()` to `Promise<{ scoresComputed: number }>`** and return `{ scoresComputed: bySector.size }`.

This is a targeted, minimal change to the use case. The alternative (reading sector count from a separate query) adds complexity without value.

**Updated `ComputeDailyScoresUseCase.execute()` return:**
```typescript
async execute(date: Date): Promise<{ scoresComputed: number }> {
  // ... existing logic unchanged ...
  console.log(`[PIPELINE] scoring: ${bySector.size} sector scores computed`);
  return { scoresComputed: bySector.size };
}
```

**Verify existing tests in `compute-daily-scores.use-case.test.ts` still pass** — they currently `await useCase.execute(date)` without using the return value, so adding a return value is non-breaking.

### RunDailyPipelineUseCase — Updated Implementation

```typescript
// src/lib/server/cross-context/pipeline/application/run-daily-pipeline.use-case.ts
import type { IngestNewsUseCase, IngestNewsResult } from '$lib/server/contexts/news/application/use-cases/ingest-news.use-case';
import type { ComputeDailyScoresUseCase } from '$lib/server/contexts/scoring/application/use-cases/compute-daily-scores.use-case';

export interface RunDailyPipelineResult {
  articlesIngested: number;
  impactsStored: number;
  scoresComputed: number;
}

export class RunDailyPipelineUseCase {
  constructor(
    private readonly ingestNewsUseCase: IngestNewsUseCase,
    private readonly computeDailyScoresUseCase: ComputeDailyScoresUseCase
  ) {}

  async execute(): Promise<RunDailyPipelineResult> {
    let articlesIngested = 0;
    let impactsStored = 0;

    try {
      const ingestResult: IngestNewsResult = await this.ingestNewsUseCase.execute();
      articlesIngested = ingestResult.articlesIngested;
      impactsStored = ingestResult.impactsStored;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[PIPELINE] ingest error: ${message}`);
      // Continue to scoring — it can run on existing event store data
    }

    const { scoresComputed } = await this.computeDailyScoresUseCase.execute(new Date());

    return { articlesIngested, impactsStored, scoresComputed };
  }
}
```

**Key design decisions:**
- Ingest errors are caught, logged, and do NOT abort scoring (AC #2)
- Scoring errors propagate up — `cron-handler.ts` already handles unhandled throws with HTTP 500
- `[PIPELINE] scoring: N sector scores computed` is already logged inside `ComputeDailyScoresUseCase` — do NOT add a duplicate log here
- `new Date()` at the point of scoring call = today's date. This is correct: the pipeline always scores for today.

### Updated +server.ts Wiring

```typescript
// src/routes/api/cron/daily/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { ANTHROPIC_API_KEY } from '$env/static/private';
import { DrizzleNewsImpactRepository } from '$lib/server/contexts/news/infrastructure/db/news-impact.repository';
import { AnthropicClassifier } from '$lib/server/contexts/news/infrastructure/llm/anthropic-classifier';
import { RssFetcher } from '$lib/server/contexts/news/infrastructure/rss/rss-fetcher';
import { IngestNewsUseCase } from '$lib/server/contexts/news/application/use-cases/ingest-news.use-case';
import { DrizzleNewsImpactReadRepository } from '$lib/server/contexts/scoring/infrastructure/db/news-impact.read.repository';
import { DrizzleSectorScoreRepository } from '$lib/server/contexts/scoring/infrastructure/db/sector-score.repository';
import { ComputeDailyScoresUseCase } from '$lib/server/contexts/scoring/application/use-cases/compute-daily-scores.use-case';
import { RunDailyPipelineUseCase } from '$lib/server/cross-context/pipeline/application/run-daily-pipeline.use-case';
import { handleCronRequest } from '$lib/server/cross-context/pipeline/interface/cron-handler';

const FEED_URLS = [
  'https://feeds.reuters.com/reuters/businessNews',
  'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
];

export const GET: RequestHandler = async ({ request }) => {
  const newsRepo = new DrizzleNewsImpactRepository();
  const classifier = new AnthropicClassifier(ANTHROPIC_API_KEY);
  const fetcher = new RssFetcher();
  const ingestUseCase = new IngestNewsUseCase(fetcher, classifier, newsRepo, FEED_URLS);

  const newsReadRepo = new DrizzleNewsImpactReadRepository();
  const sectorScoreRepo = new DrizzleSectorScoreRepository();
  const computeUseCase = new ComputeDailyScoresUseCase(newsReadRepo, sectorScoreRepo);

  const pipeline = new RunDailyPipelineUseCase(ingestUseCase, computeUseCase);

  return handleCronRequest(request, pipeline);
};
```

**Constructor signatures confirmed from codebase:**
- `DrizzleNewsImpactRepository()` — no args (uses imported `db` singleton internally)
- `DrizzleNewsImpactReadRepository()` — no args (uses imported `db` singleton internally)
- `DrizzleSectorScoreRepository()` — no args (uses imported `db` singleton internally)
- `AnthropicClassifier(apiKey: string)` — pass `ANTHROPIC_API_KEY`
- `RssFetcher()` — no args
- `ComputeDailyScoresUseCase(newsImpactReadPort, sectorScoreRepo)`

### cron-handler.ts — No Logic Change Needed

The current `cron-handler.ts` serializes `result` directly with `JSON.stringify(result)`. Since `RunDailyPipelineResult` now includes `scoresComputed`, it will automatically appear in the HTTP 200 response body. No logic change needed — only verify the type flows correctly.

### Architecture Compliance

- ✅ `RunDailyPipelineUseCase` in `cross-context/pipeline/` is the ONLY place allowed to import from multiple contexts
- ✅ `ComputeDailyScoresUseCase` imported by class reference (not by interface) — consistent with how `IngestNewsUseCase` is imported
- ✅ Route handler `+server.ts` does all instantiation (manual DI, no container)
- ✅ No DB queries in `run-daily-pipeline.use-case.ts` — all DB access through use case → port → repository
- ✅ `$lib/server/...` alias for cross-context imports (established in Story 2.4 debug log)
- ✅ Logging format: `[PIPELINE] ingest error: <message>` / `[PIPELINE] scoring: N sector scores computed`

### Import Alias Convention

Use `$lib/server/...` alias for all cross-context imports in `run-daily-pipeline.use-case.ts`. Relative paths fail TS resolution from the `cross-context/` directory (confirmed in Story 2.4 debug log).

### No Tests Required for This Story

`RunDailyPipelineUseCase` is integration-level orchestration. Unit testing it would require mocking both `IngestNewsUseCase` and `ComputeDailyScoresUseCase`, adding complexity without value for MVP. Both underlying use cases already have their own unit tests (Stories 2.3, 3.1).

**Do NOT create a test file for `RunDailyPipelineUseCase`.**

### Existing Test Suite Must Remain Green

After modifications, run `vitest` to verify all existing tests pass:
- `compute-daily-scores.use-case.test.ts` — 5 tests (return type change from `void` to `{ scoresComputed }` is non-breaking)
- `get-sector-dashboard.use-case.test.ts` — 3 tests (no changes to this use case)
- Full suite: currently 63 tests passing

### Error Flow Summary

```
Vercel Cron → GET /api/cron/daily
  → +server.ts: instantiate all adapters + use cases
  → handleCronRequest(): validate CRON_SECRET
    → 401 if invalid (no execution)
    → RunDailyPipelineUseCase.execute()
      → IngestNewsUseCase.execute()
          per-feed error → logged internally, continues
          per-article error → logged internally, continues
          → { articlesIngested, impactsStored }
        ingest unhandled error → console.error [PIPELINE] ingest error: msg → continue to scoring
      → ComputeDailyScoresUseCase.execute(today)
          → logs [PIPELINE] scoring: N sector scores computed
          → { scoresComputed: N }
        scoring unhandled error → propagates up → cron-handler returns HTTP 500
    → 200 { articlesIngested, impactsStored, scoresComputed }
```

### References

- Epics: `_bmad-output/planning-artifacts/epics.md` — Story 3.3 acceptance criteria
- Architecture: `_bmad-output/planning-artifacts/architecture.md` — Cross-Context Use Case Pattern, Dependency Rules, Logging
- Story 2.4 file: `_bmad-output/implementation-artifacts/2-4-cron-endpoint-and-run-daily-pipeline-use-case.md` — `RunDailyPipelineUseCase` original implementation, debug log with `$lib/server/...` alias
- Story 3.1 file: `_bmad-output/implementation-artifacts/3-1-news-impact-read-port-and-compute-daily-scores-use-case.md` — `ComputeDailyScoresUseCase` constructor + return type
- `src/lib/server/cross-context/pipeline/application/run-daily-pipeline.use-case.ts` — current implementation to extend
- `src/routes/api/cron/daily/+server.ts` — current wiring to update

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- `ComputeDailyScoresUseCase.execute()` return type changed from `Promise<void>` to `Promise<{ scoresComputed: number }>`. Non-breaking: all 5 existing tests ignore return value.
- `RunDailyPipelineUseCase` restructured: ingest errors now caught, logged (`[PIPELINE] ingest error: msg`), and execution continues to scoring (AC #2). Scoring errors propagate to cron-handler for HTTP 500.
- `+server.ts` wired with `DrizzleNewsImpactReadRepository`, `DrizzleSectorScoreRepository`, `ComputeDailyScoresUseCase` instantiated and injected as second arg to `RunDailyPipelineUseCase`.
- `cron-handler.ts`: no change needed — `JSON.stringify(result)` automatically includes `scoresComputed` in HTTP 200 response (AC #3).
- Full test suite: 63/63 passing. TypeScript: 0 errors.

### File List

- `src/lib/server/contexts/scoring/application/use-cases/compute-daily-scores.use-case.ts` (modified)
- `src/lib/server/cross-context/pipeline/application/run-daily-pipeline.use-case.ts` (modified)
- `src/routes/api/cron/daily/+server.ts` (modified)

## Change Log

- 2026-03-19: Story 3.3 created — RunDailyPipelineUseCase scoring step wired
- 2026-03-19: Story 3.3 implemented — ingest → score pipeline wired, scoresComputed in cron response
