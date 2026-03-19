# Story 3.2: GetSectorDashboardUseCase & API route

Status: review

## Story

As a developer,
I want a `GetSectorDashboardUseCase` and a `GET /api/sector-scores` route,
so that the dashboard can retrieve the latest pre-computed sector scores with zero runtime calculation.

## Acceptance Criteria

1. **Given** `GetSectorDashboardUseCase` is constructed with `SectorScoreRepositoryPort`
   **When** `execute()` is called
   **Then** it returns `SectorScore[]` for the most recent date available in the snapshot table
   **And** all sectors are included in the result (no filtering at this layer)

2. **Given** `GET /api/sector-scores` receives a request
   **When** the route handler calls `GetSectorDashboardUseCase.execute()`
   **Then** it returns HTTP 200 with `{ sectors: SectorScore[] }` — direct snapshot read, zero computation
   **And** the response contains only data already materialized in `sector_scores`

3. **Given** the `sector_scores` table is empty (warm-up period)
   **When** `GET /api/sector-scores` is called
   **Then** it returns HTTP 200 with `{ sectors: [] }` — no error

4. **Given** the route is called 61 times in one minute from the same IP
   **When** the 61st request arrives
   **Then** `hooks.server.ts` returns HTTP 429 (rate limiter from Story 1.1)

## Tasks / Subtasks

- [x] Task 1: Implement `GetSectorDashboardUseCase` (AC: #1, #3)
  - [x] File: `src/lib/server/contexts/scoring/application/use-cases/get-sector-dashboard.use-case.ts` (currently empty — 1 line — implement it)
  - [x] Constructor: `(sectorScoreRepo: SectorScoreRepositoryPort)`
  - [x] `execute(): Promise<SectorScore[]>` — calls `sectorScoreRepo.findLatest()` and returns the result
  - [x] No filtering, no transformation — pure delegation to the port

- [x] Task 2: Write unit tests for `GetSectorDashboardUseCase` (AC: #1, #3)
  - [x] File: `src/lib/server/contexts/scoring/application/use-cases/get-sector-dashboard.use-case.test.ts` (create new)
  - [x] Use existing `FakeSectorScoreRepository` from `contexts/scoring/infrastructure/fakes/fake-sector-score.repository.ts`
  - [x] Test: returns all `SectorScore[]` from the latest date
  - [x] Test: empty repository → returns `[]`
  - [x] Test: multiple dates → returns only scores from the most recent date (delegates to fake which already handles this)

- [x] Task 3: Wire `GET /api/sector-scores` route handler (AC: #2, #4)
  - [x] File: `src/routes/api/sector-scores/+server.ts` (currently empty — 1 line — implement it)
  - [x] Import `GetSectorDashboardUseCase` from scoring use cases
  - [x] Import `DrizzleSectorScoreRepository` from scoring infrastructure
  - [x] Instantiate `DrizzleSectorScoreRepository`, inject into `GetSectorDashboardUseCase`, call `execute()`
  - [x] Return `json({ sectors })` with HTTP 200 on success
  - [x] Wrap in `try/catch` → return `json({ error: message, code: 500 }, { status: 500 })` on error
  - [x] Rate limiting is handled automatically by `hooks.server.ts` — do not add it here

## Dev Notes

### File Map: What Exists vs What to Create/Implement

```
src/lib/server/contexts/scoring/
├── domain/
│   ├── sector-score.ts       ✅ EXISTS — SectorScore { date: Date, sector: Sector, score: number }
│   └── decay-model.ts        ✅ EXISTS — do not touch
├── application/
│   ├── ports/
│   │   └── sector-score.repository.port.ts  ✅ EXISTS — { upsert, findLatest }
│   └── use-cases/
│       ├── get-sector-dashboard.use-case.ts  ⚠️ EXISTS BUT EMPTY (1 line) — implement it
│       ├── get-sector-dashboard.use-case.test.ts  ❌ CREATE
│       └── compute-daily-scores.use-case.ts  ✅ EXISTS — do NOT touch
└── infrastructure/
    ├── db/
    │   ├── sector-score.repository.ts   ✅ EXISTS — DrizzleSectorScoreRepository
    │   └── sector-score.schema.ts       ✅ EXISTS
    └── fakes/
        └── fake-sector-score.repository.ts  ✅ EXISTS — use as-is for tests

src/routes/api/sector-scores/
└── +server.ts   ⚠️ EXISTS BUT EMPTY (1 line) — implement it
```

**Do NOT touch:**
- `compute-daily-scores.use-case.ts` — Story 3.1, complete
- `fake-sector-score.repository.ts` — no changes needed
- `sector-score.repository.port.ts` — interface already correct
- Anything in `contexts/news/` — Epic 2 is complete

### Exact Implementation: GetSectorDashboardUseCase

```typescript
// src/lib/server/contexts/scoring/application/use-cases/get-sector-dashboard.use-case.ts
import type { SectorScoreRepositoryPort } from '../ports/sector-score.repository.port';
import type { SectorScore } from '../../domain/sector-score';

export class GetSectorDashboardUseCase {
  constructor(private readonly sectorScoreRepo: SectorScoreRepositoryPort) {}

  async execute(): Promise<SectorScore[]> {
    return this.sectorScoreRepo.findLatest();
  }
}
```

**Why this is correct:** `findLatest()` on `DrizzleSectorScoreRepository` already queries `WHERE date = (SELECT MAX(date) FROM sector_scores)` — the use case simply delegates. No scoring logic here (that belongs to `ComputeDailyScoresUseCase`).

### Exact Implementation: `GET /api/sector-scores` Route Handler

```typescript
// src/routes/api/sector-scores/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GetSectorDashboardUseCase } from '$lib/server/contexts/scoring/application/use-cases/get-sector-dashboard.use-case';
import { DrizzleSectorScoreRepository } from '$lib/server/contexts/scoring/infrastructure/db/sector-score.repository';

export const GET: RequestHandler = async () => {
  try {
    const repo = new DrizzleSectorScoreRepository();
    const useCase = new GetSectorDashboardUseCase(repo);
    const sectors = await useCase.execute();
    return json({ sectors });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message, code: 500 }, { status: 500 });
  }
};
```

### SectorScore Type (already defined in domain)

```typescript
// sector-score.ts — already exists, do not modify
import type { Sector } from '../../news/domain/sector';

export interface SectorScore {
  date: Date;
  sector: Sector;
  score: number; // unbounded — sum of decayed impacts
}
```

**Important for JSON serialization:** `SectorScore.date` is a `Date` object. When serialized via `json()`, it becomes an ISO string like `"2026-03-19T00:00:00.000Z"`. This is correct per architecture data exchange format. No special handling required.

### SectorScoreRepositoryPort (already defined)

```typescript
// sector-score.repository.port.ts — already exists, do not modify
export interface SectorScoreRepositoryPort {
  upsert(score: SectorScore): Promise<void>;
  findLatest(): Promise<SectorScore[]>;
}
```

### FakeSectorScoreRepository (already exists — use for tests)

```typescript
// Already implemented — key behavior for tests:
// - findLatest() returns [] when scores map is empty
// - findLatest() finds max date across all scores and returns only those entries
// - upsert() uses Map with key `${date.toISOString()}-${sector}` — overwrites on same date+sector
```

### DrizzleSectorScoreRepository.findLatest() — What It Does

```typescript
// Existing implementation queries:
// SELECT * FROM sector_scores WHERE date = (SELECT MAX(date) FROM sector_scores)
// Returns [] when table is empty (no rows match WHERE clause)
// Returns SectorScore[] with date: new Date(row.date), sector: row.sector as Sector, score: row.score
```

### Route Handler Pattern — Follow Existing Routes

The route handler pattern follows what exists in the codebase for other API routes:
- Import `json` from `@sveltejs/kit`
- Import `RequestHandler` from `./$types`
- Use `export const GET: RequestHandler = async () => { ... }`
- Manual instantiation: `new DrizzleSectorScoreRepository()` directly in the handler
- Inject into use case constructor
- `try/catch` with `json({ error, code }, { status })` on failure

### Architecture Compliance

- ✅ Use case imports only own ports and domain — no cross-context imports needed
- ✅ Route handler is wiring-only — business logic stays in use case
- ✅ No DB query in route handler — goes through use case → port → repository
- ✅ Rate limiting handled by `hooks.server.ts` automatically for `/api/*` routes
- ✅ Error response shape: `{ error: string, code: number }` (architecture convention)
- ✅ Success response shape: `{ sectors: SectorScore[] }` (no envelope, direct data)
- ✅ `db` singleton used via `DrizzleSectorScoreRepository` — never instantiate a new connection

### No New Files in Infrastructure Needed

`DrizzleSectorScoreRepository` already implements `findLatest()` correctly. No new adapters, schemas, or fakes are required for this story.

### No DB Migration Needed

This story reads from the existing `sector_scores` table (created in Epic 1). No schema changes.

### Testing Pattern for GetSectorDashboardUseCase

```typescript
// src/lib/server/contexts/scoring/application/use-cases/get-sector-dashboard.use-case.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GetSectorDashboardUseCase } from './get-sector-dashboard.use-case';
import { FakeSectorScoreRepository } from '../../infrastructure/fakes/fake-sector-score.repository';

describe('GetSectorDashboardUseCase', () => {
  let fake: FakeSectorScoreRepository;
  let useCase: GetSectorDashboardUseCase;

  beforeEach(() => {
    fake = new FakeSectorScoreRepository();
    useCase = new GetSectorDashboardUseCase(fake);
  });

  it('returns empty array when no scores exist', async () => {
    const result = await useCase.execute();
    expect(result).toEqual([]);
  });

  it('returns all scores for the latest date', async () => {
    const today = new Date('2026-03-19');
    await fake.upsert({ date: today, sector: 'TECHNOLOGY', score: 0.5 });
    await fake.upsert({ date: today, sector: 'ENERGY', score: -0.2 });
    const result = await useCase.execute();
    expect(result).toHaveLength(2);
  });

  it('returns only latest date scores when multiple dates exist', async () => {
    const yesterday = new Date('2026-03-18');
    const today = new Date('2026-03-19');
    await fake.upsert({ date: yesterday, sector: 'TECHNOLOGY', score: 0.3 });
    await fake.upsert({ date: today, sector: 'TECHNOLOGY', score: 0.5 });
    const result = await useCase.execute();
    expect(result).toHaveLength(1);
    expect(result[0].date.toISOString()).toContain('2026-03-19');
  });
});
```

### Import Alias Convention

Use `$lib/server/...` alias for cross-layer imports in route handlers (established in Story 2.4 and used throughout the codebase):
- `$lib/server/contexts/scoring/application/use-cases/get-sector-dashboard.use-case`
- `$lib/server/contexts/scoring/infrastructure/db/sector-score.repository`

Relative paths are used within the same context (e.g., inside `use-cases/` referencing `../ports/`).

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md` — Dependency Rules, API Patterns, Error Handling
- Epics: `_bmad-output/planning-artifacts/epics.md` — Story 3.2 acceptance criteria
- Story 3.1: `_bmad-output/implementation-artifacts/3-1-news-impact-read-port-and-compute-daily-scores-use-case.md` — established patterns
- `contexts/scoring/application/ports/sector-score.repository.port.ts` — `SectorScoreRepositoryPort`
- `contexts/scoring/infrastructure/db/sector-score.repository.ts` — `DrizzleSectorScoreRepository.findLatest()`
- `contexts/scoring/infrastructure/fakes/fake-sector-score.repository.ts` — fake for unit tests
- `contexts/scoring/domain/sector-score.ts` — `SectorScore` type

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Implemented all 3 tasks in one session. 3 unit tests added, 63/63 suite passes (no regressions).
- `GetSectorDashboardUseCase.execute()` is a pure delegation to `sectorScoreRepo.findLatest()` — no business logic, no filtering.
- `GET /api/sector-scores` handler follows the manual DI wiring pattern established in the codebase: instantiate `DrizzleSectorScoreRepository` directly, inject into use case, return `json({ sectors })`.
- Rate limiting (AC #4) is handled automatically by `hooks.server.ts` — no additional code needed in the route handler.
- No new DB migration required — reads from existing `sector_scores` table.

### File List

- `src/lib/server/contexts/scoring/application/use-cases/get-sector-dashboard.use-case.ts` (implemented, was empty)
- `src/lib/server/contexts/scoring/application/use-cases/get-sector-dashboard.use-case.test.ts` (new — 3 unit tests)
- `src/routes/api/sector-scores/+server.ts` (implemented, was empty)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated: 3-2 → review)
- `_bmad-output/implementation-artifacts/3-2-get-sector-dashboard-use-case-and-api-route.md` (story updated)

## Change Log

- 2026-03-19: Story 3.2 created — GetSectorDashboardUseCase implementation + GET /api/sector-scores route wiring
- 2026-03-19: Story 3.2 implemented — GetSectorDashboardUseCase, 3 unit tests, GET /api/sector-scores route handler (63/63 suite green)
