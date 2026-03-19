# Story 1.5: Scoring Infrastructure — DB schema, repository port, Drizzle repository, fakes

Status: review

## Story

As a developer,
I want the `sector_scores` DB schema, repository port, Drizzle implementation, and fakes defined,
So that the scoring engine can persist and retrieve materialized score snapshots.

## Acceptance Criteria

1. **Given** `sector-score.schema.ts` defines the Drizzle table
   **When** `drizzle-kit generate` is run
   **Then** a migration is produced with table `sector_scores` and columns: `date`, `sector`, `score` — all snake_case

2. **Given** `sector-score.repository.port.ts` defines the port
   **When** imported from `contexts/scoring/application/`
   **Then** it exposes: `upsert(score: SectorScore): Promise<void>` and `findLatest(): Promise<SectorScore[]>`

3. **Given** `DrizzleSectorScoreRepository` implements the port
   **When** `upsert()` is called for the same sector and date twice
   **Then** the second call overwrites the first (no duplicate rows per sector+date)
   **And** camelCase ↔ snake_case mapping is applied at the repository boundary

4. **Given** `FakeSectorScoreRepository` exists in `infrastructure/fakes/`
   **When** used in unit tests
   **Then** it satisfies the port interface with an in-memory map, no DB required

## Tasks / Subtasks

- [x] Task 1: Define Drizzle schema `sector-score.schema.ts` (AC: #1)
    - [x] Define `sectorScoresTable` with: `date` (date column, not timestamp), `sector` (text), `score` (real)
    - [x] Primary key: composite on `(date, sector)` — upsert semantics require this
    - [x] All DB columns snake_case; camelCase in Drizzle field names
    - [x] File location: `src/lib/server/contexts/scoring/infrastructure/db/sector-score.schema.ts` (create new)

- [x] Task 2: Fill `sector-score.repository.port.ts` (AC: #2)
    - [x] Define `SectorScoreRepositoryPort` interface
    - [x] Expose `upsert(score: SectorScore): Promise<void>`
    - [x] Expose `findLatest(): Promise<SectorScore[]>`
    - [x] Import `SectorScore` from `../../domain/sector-score` only
    - [x] File location: `src/lib/server/contexts/scoring/application/ports/sector-score.repository.port.ts` (exists as empty stub — fill it)

- [x] Task 3: Implement `DrizzleSectorScoreRepository` (AC: #3)
    - [x] Implement `SectorScoreRepositoryPort`
    - [x] `upsert()`: insert with `onConflictDoUpdate` on `(date, sector)` — overwrites `score`
    - [x] `findLatest()`: select all rows WHERE date = (SELECT MAX(date) FROM sector_scores)
    - [x] Map DB rows ↔ domain `SectorScore` (date as `Date` object, sector as `Sector` type cast)
    - [x] Import `db` from `$lib/server/shared/db/client`
    - [x] Import schema from `./sector-score.schema`
    - [x] File location: `src/lib/server/contexts/scoring/infrastructure/db/sector-score.repository.ts` (exists as empty stub — fill it)

- [x] Task 4: Implement `FakeSectorScoreRepository` (AC: #4)
    - [x] Implement `SectorScoreRepositoryPort` with in-memory Map
    - [x] `upsert()`: key = `${date.toISOString()}-${sector}` → overwrites on collision
    - [x] `findLatest()`: find max date among all stored scores, return all with that date
    - [x] Expose `scores` public map for test assertions
    - [x] File location: `src/lib/server/contexts/scoring/infrastructure/fakes/fake-sector-score.repository.ts` (create new — directory may not exist yet)

- [x] Task 5: Write unit tests for `FakeSectorScoreRepository` (AC: #4)
    - [x] File: `src/lib/server/contexts/scoring/infrastructure/fakes/fake-sector-score.repository.test.ts`
    - [x] Tests: starts empty, upsert stores score, upsert overwrites same sector+date, findLatest returns only max-date scores, accumulates multiple sectors

- [x] Task 6 (optional): Write integration test `sector-score.repository.integration.test.ts`
    - [x] Follow the same `describe.skipIf(!hasDb)` pattern from Story 1.3
    - [x] Tests: upsert inserts row, upsert twice same sector+date = one row, findLatest returns max-date entries

## Dev Notes

### File Locations — What Exists vs What to Create

```
src/lib/server/contexts/scoring/
├── domain/
│   ├── sector-score.ts              ← DONE (Story 1.4) — do not touch
│   ├── decay-model.ts               ← DONE (Story 1.4) — do not touch
│   └── decay-model.test.ts          ← DONE (Story 1.4) — do not touch
├── application/
│   ├── ports/
│   │   ├── sector-score.repository.port.ts  ← EXISTS AS EMPTY STUB — fill it
│   │   └── news-impact.read.port.ts         ← NOT this story — leave empty (Story 3.1)
│   └── use-cases/
│       ├── compute-daily-scores.use-case.ts ← NOT this story — leave empty (Story 3.1)
│       └── get-sector-dashboard.use-case.ts ← NOT this story — leave empty (Story 3.2)
└── infrastructure/
    ├── db/
    │   ├── sector-score.schema.ts           ← CREATE NEW
    │   └── sector-score.repository.ts       ← EXISTS AS EMPTY STUB — fill it
    └── fakes/
        └── fake-sector-score.repository.ts  ← CREATE NEW (directory may not exist)
```

Do NOT touch `news-impact.read.port.ts`, `compute-daily-scores.use-case.ts`, `get-sector-dashboard.use-case.ts` — those belong to Stories 3.1 and 3.2.

### Drizzle Schema — Exact Pattern

```typescript
// src/lib/server/contexts/scoring/infrastructure/db/sector-score.schema.ts
import { pgTable, text, real, date } from 'drizzle-orm/pg-core';

export const sectorScoresTable = pgTable(
    'sector_scores',
    {
        date: date('date').notNull(),
        sector: text('sector').notNull(),
        score: real('score').notNull()
    },
    (table) => ({
        pk: primaryKey({ columns: [table.date, table.sector] })
    })
);
```

**Import `primaryKey` from `drizzle-orm/pg-core`:**

```typescript
import { pgTable, text, real, date, primaryKey } from 'drizzle-orm/pg-core';
```

**Why `date` column type (not `timestamp`)?** `sector_scores` is a daily snapshot — one row per (day, sector). Using `date` prevents time-of-day ambiguity and simplifies the "latest date" query.

**Why composite PK `(date, sector)`?** Enforces the one-row-per-sector-per-day invariant at the DB level. The `onConflictDoUpdate` upsert in the repository relies on this constraint.

**Why `real` for `score`?** The decay sum is unbounded but float precision is sufficient. Consistent with `impact_score` in `news_impacts`.

### Repository Port — Exact Pattern

```typescript
// src/lib/server/contexts/scoring/application/ports/sector-score.repository.port.ts
import type { SectorScore } from '../../domain/sector-score';

export interface SectorScoreRepositoryPort {
    upsert(score: SectorScore): Promise<void>;
    findLatest(): Promise<SectorScore[]>;
}
```

**Dependency rule:** imports only from own domain (`../../domain/`). No Drizzle, no DB.

### Drizzle Repository — Upsert Pattern

```typescript
// src/lib/server/contexts/scoring/infrastructure/db/sector-score.repository.ts
import { db } from '$lib/server/shared/db/client';
import { sectorScoresTable } from './sector-score.schema';
import { eq, sql } from 'drizzle-orm';
import type { SectorScoreRepositoryPort } from '../../application/ports/sector-score.repository.port';
import type { SectorScore } from '../../domain/sector-score';
import type { Sector } from '../../../news/domain/sector';

export class DrizzleSectorScoreRepository implements SectorScoreRepositoryPort {
    async upsert(score: SectorScore): Promise<void> {
        const dateStr = score.date.toISOString().split('T')[0]; // 'YYYY-MM-DD'
        await db
            .insert(sectorScoresTable)
            .values({
                date: dateStr,
                sector: score.sector,
                score: score.score
            })
            .onConflictDoUpdate({
                target: [sectorScoresTable.date, sectorScoresTable.sector],
                set: { score: score.score }
            });
    }

    async findLatest(): Promise<SectorScore[]> {
        const latestDate = db
            .select({ maxDate: sql<string>`MAX(${sectorScoresTable.date})` })
            .from(sectorScoresTable)
            .as('latest');

        const rows = await db
            .select()
            .from(sectorScoresTable)
            .where(eq(sectorScoresTable.date, sql`(SELECT MAX(date) FROM sector_scores)`));

        return rows.map((row) => ({
            date: new Date(row.date),
            sector: row.sector as Sector,
            score: row.score
        }));
    }
}
```

**Critical notes:**

- `date` column stores `'YYYY-MM-DD'` string — convert `Date` to ISO date string before insert: `score.date.toISOString().split('T')[0]`
- `onConflictDoUpdate` requires explicit `target` (the composite PK columns) and `set` (fields to overwrite)
- `findLatest()` uses a subquery `(SELECT MAX(date) FROM sector_scores)` to get the most recent date — Drizzle supports inline SQL with `sql\`...\``
- Map `row.date` (string) back to `new Date(row.date)` at the repository boundary
- Cast `row.sector` to `Sector` type — stored as plain `text` in DB

### Fake Repository — In-Memory Map Pattern

```typescript
// src/lib/server/contexts/scoring/infrastructure/fakes/fake-sector-score.repository.ts
import type { SectorScoreRepositoryPort } from '../../application/ports/sector-score.repository.port';
import type { SectorScore } from '../../domain/sector-score';

export class FakeSectorScoreRepository implements SectorScoreRepositoryPort {
    public scores: Map<string, SectorScore> = new Map();

    private key(score: SectorScore): string {
        return `${score.date.toISOString()}-${score.sector}`;
    }

    async upsert(score: SectorScore): Promise<void> {
        this.scores.set(this.key(score), score);
    }

    async findLatest(): Promise<SectorScore[]> {
        if (this.scores.size === 0) return [];
        const all = Array.from(this.scores.values());
        const maxTime = Math.max(...all.map((s) => s.date.getTime()));
        return all.filter((s) => s.date.getTime() === maxTime);
    }
}
```

**Why `Map` instead of array?** The composite key (date+sector) uniqueness invariant is naturally expressed by a map — inserting the same key twice auto-overwrites without array splicing.

**Why `public scores`?** Tests assert on stored data directly: `expect(repo.scores.size).toBe(1)`.

### Unit Test Pattern for Fake

```typescript
// src/lib/server/contexts/scoring/infrastructure/fakes/fake-sector-score.repository.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { FakeSectorScoreRepository } from './fake-sector-score.repository';
import { Sector } from '../../../news/domain/sector';

describe('FakeSectorScoreRepository', () => {
    let repo: FakeSectorScoreRepository;
    const today = new Date('2026-03-19');
    const yesterday = new Date('2026-03-18');

    beforeEach(() => {
        repo = new FakeSectorScoreRepository();
    });

    it('starts empty', async () => {
        const result = await repo.findLatest();
        expect(result).toHaveLength(0);
    });

    it('stores a score via upsert', async () => {
        await repo.upsert({ date: today, sector: Sector.TECHNOLOGY, score: 0.7 });
        expect(repo.scores.size).toBe(1);
    });

    it('overwrites same sector+date on second upsert', async () => {
        await repo.upsert({ date: today, sector: Sector.TECHNOLOGY, score: 0.7 });
        await repo.upsert({ date: today, sector: Sector.TECHNOLOGY, score: 0.3 });
        expect(repo.scores.size).toBe(1);
        const result = await repo.findLatest();
        expect(result[0].score).toBeCloseTo(0.3);
    });

    it('findLatest returns only max-date scores', async () => {
        await repo.upsert({ date: yesterday, sector: Sector.ENERGY, score: 0.5 });
        await repo.upsert({ date: today, sector: Sector.TECHNOLOGY, score: 0.8 });
        const result = await repo.findLatest();
        expect(result).toHaveLength(1);
        expect(result[0].sector).toBe(Sector.TECHNOLOGY);
    });

    it('returns all sectors for max date', async () => {
        await repo.upsert({ date: today, sector: Sector.TECHNOLOGY, score: 0.8 });
        await repo.upsert({ date: today, sector: Sector.ENERGY, score: -0.3 });
        const result = await repo.findLatest();
        expect(result).toHaveLength(2);
    });
});
```

### Integration Test Pattern (Optional)

```typescript
// src/lib/server/contexts/scoring/infrastructure/db/sector-score.repository.integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { DrizzleSectorScoreRepository } from './sector-score.repository';
import { Sector } from '../../../news/domain/sector';

// Skip integration tests if DATABASE_URL not set (same pattern as Story 1.3)
const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)('DrizzleSectorScoreRepository (integration)', () => {
    let repo: DrizzleSectorScoreRepository;

    beforeEach(() => {
        repo = new DrizzleSectorScoreRepository();
    });

    it('upserts and retrieves a score', async () => {
        const score = { date: new Date('2026-03-19'), sector: Sector.TECHNOLOGY, score: 0.7 };
        await repo.upsert(score);
        const result = await repo.findLatest();
        const found = result.find((s) => s.sector === Sector.TECHNOLOGY);
        expect(found?.score).toBeCloseTo(0.7);
    });

    it('upsert twice same key = one row', async () => {
        const score = { date: new Date('2026-03-19'), sector: Sector.ENERGY, score: 0.5 };
        await repo.upsert(score);
        await repo.upsert({ ...score, score: 0.9 });
        const result = await repo.findLatest();
        const found = result.filter((s) => s.sector === Sector.ENERGY);
        expect(found).toHaveLength(1);
        expect(found[0].score).toBeCloseTo(0.9);
    });
});
```

### drizzle.config.ts — Already Updated

`drizzle.config.ts` was updated in Story 1.3 to use glob:

```typescript
schema: './src/lib/server/contexts/**/infrastructure/db/*.schema.ts',
```

This already matches `sector-score.schema.ts` — **no change needed**.

### Architecture Compliance Checklist

- ✅ `sector-score.schema.ts` is in `infrastructure/db/` — correct layer
- ✅ `sector-score.repository.port.ts` is in `application/ports/` — imports only from `domain/`
- ✅ `DrizzleSectorScoreRepository` is in `infrastructure/db/` — imports domain types + Drizzle
- ✅ `FakeSectorScoreRepository` is in `infrastructure/fakes/` — imports domain types only
- ❌ NEVER import `db` or Drizzle in domain files or application files
- ❌ NEVER put business logic in the repository (no decay calculation, no scoring logic)
- ❌ NEVER import from `contexts/news/` in application or use-case files of scoring context — only in infrastructure (casting) or domain (allowed per Story 1.4 pattern)

### Import Patterns From Existing Code

- DB client: `import { db } from '$lib/server/shared/db/client';` — use SvelteKit alias, not relative path
- Drizzle SQL helper: `import { sql, eq } from 'drizzle-orm';`
- Schema imports: relative, e.g. `import { sectorScoresTable } from './sector-score.schema';`
- Domain types: relative from infrastructure, e.g. `import type { SectorScore } from '../../domain/sector-score';`
- `Sector` type in infrastructure (for casting only): `import type { Sector } from '../../../news/domain/sector';`

### ID Note — No `id` Column on `sector_scores`

Unlike `news` and `news_impacts` which use a string `id` as primary key, `sector_scores` uses a **composite primary key** `(date, sector)`. There is no separate `id` column. This is intentional — a score snapshot is uniquely identified by its date and sector.

### Relationship With Other Stories

- **Story 1.4** (previous): provided `SectorScore` interface and `Sector` type — import from there
- **Story 3.1**: `ComputeDailyScoresUseCase` will call `upsert()` for each computed score
- **Story 3.2**: `GetSectorDashboardUseCase` will call `findLatest()` to serve the dashboard
- **Story 1.3** (done): established the Drizzle schema, repository, and fake patterns — follow exactly the same structure

### Patterns From Previous Stories

- Tests use `import { describe, it, expect, beforeEach } from 'vitest'` — no test setup framework
- Unit tests (fakes) are co-located in `infrastructure/fakes/` folder
- Integration tests suffix: `.integration.test.ts` — guarded with `describe.skipIf(!hasDb)`
- `hasDb = !!process.env.DATABASE_URL` — same env check pattern as Story 1.3
- Run unit tests: `npm run test:unit`
- `$lib/server/` alias = `src/lib/server/` — confirmed in Story 1.1
- Fakes expose public state for test assertions (`public scores`)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_none_

### Completion Notes List

- Task 1: `sectorScoresTable` créée avec PK composite `(date, sector)`, colonnes `date`/`sector`/`score` en snake_case. Migration générée: `drizzle/migrations/0001_sleepy_wendigo.sql` — table `sector_scores` confirmée.
- Task 2: `SectorScoreRepositoryPort` défini avec `upsert()` et `findLatest()`, import du domain uniquement.
- Task 3: `DrizzleSectorScoreRepository` implémenté — `upsert` avec `onConflictDoUpdate` sur PK composite, `findLatest` avec subquery `MAX(date)`, mapping camelCase ↔ snake_case à la frontière.
- Task 4: `FakeSectorScoreRepository` implémenté avec `Map<string, SectorScore>`, clé composite `date.toISOString()-sector`, public `scores` pour assertions de test.
- Task 5: 5 tests unitaires pour `FakeSectorScoreRepository` — tous passent (36 passed total).
- Task 6: Test d'intégration créé avec `describe.skipIf(!hasDb)` — ignoré sans DATABASE_URL.

### File List

- `src/lib/server/contexts/scoring/infrastructure/db/sector-score.schema.ts` (créé)
- `src/lib/server/contexts/scoring/application/ports/sector-score.repository.port.ts` (rempli)
- `src/lib/server/contexts/scoring/infrastructure/db/sector-score.repository.ts` (rempli)
- `src/lib/server/contexts/scoring/infrastructure/fakes/fake-sector-score.repository.ts` (créé)
- `src/lib/server/contexts/scoring/infrastructure/fakes/fake-sector-score.repository.test.ts` (créé)
- `src/lib/server/contexts/scoring/infrastructure/db/sector-score.repository.integration.test.ts` (créé)
- `drizzle/migrations/0001_sleepy_wendigo.sql` (généré)
- `drizzle/migrations/meta/0001_snapshot.json` (généré)
- `drizzle/migrations/meta/_journal.json` (mis à jour)

## Change Log

- 2026-03-19: Story created by create-story workflow
- 2026-03-19: Story implemented by dev agent — all tasks complete, 36 unit tests passing
