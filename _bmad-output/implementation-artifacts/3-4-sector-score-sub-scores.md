# Story 3.4: SectorScore — PUNCTUAL and STRUCTURAL sub-scores

Status: review

## Story

As a developer,
I want `SectorScore` to expose separate `punctualScore` and `structuralScore` fields alongside the existing composite `score`,
so that the dashboard can independently color the inner ring (PUNCTUAL) and outer ripples (STRUCTURAL) of each Ripple Cast visual.

## Acceptance Criteria

1. **Given** `SectorScore` is defined in `contexts/scoring/domain/sector-score.ts`
   **When** imported anywhere in the codebase
   **Then** it contains `date: Date`, `sector: Sector`, `score: number`, `punctualScore: number`, `structuralScore: number`

2. **Given** `ComputeDailyScoresUseCase.execute(date)` runs
   **When** a sector has both PUNCTUAL and STRUCTURAL impacts
   **Then** `punctualScore = Σ decayed PUNCTUAL impacts` and `structuralScore = Σ decayed STRUCTURAL impacts` are computed separately
   **And** `score = punctualScore + structuralScore` (composite remains the sum)

3. **Given** a sector has only STRUCTURAL impacts
   **When** scores are computed
   **Then** `punctualScore = 0` and `structuralScore > 0`

4. **Given** a sector has only PUNCTUAL impacts
   **When** scores are computed
   **Then** `punctualScore > 0` and `structuralScore = 0`

5. **Given** the `sector_scores` DB table
   **When** `DrizzleSectorScoreRepository.upsert()` is called
   **Then** it persists `punctual_score` and `structural_score` columns
   **And** `onConflictDoUpdate` updates all three score fields

6. **Given** `DrizzleSectorScoreRepository.findLatest()` is called
   **When** rows are mapped to `SectorScore[]`
   **Then** `punctualScore` and `structuralScore` are correctly mapped from DB columns

7. **Given** a DB migration is applied
   **When** the `sector_scores` table is inspected
   **Then** it has two new `real` columns: `punctual_score NOT NULL DEFAULT 0` and `structural_score NOT NULL DEFAULT 0`

8. **Given** unit tests use `FakeSectorScoreRepository` and `FakeNewsImpactReadRepository`
   **When** vitest runs
   **Then** tests verify: PUNCTUAL-only sector has `structuralScore=0`, STRUCTURAL-only has `punctualScore=0`, mixed sector has both non-zero, composite `score = punctualScore + structuralScore`

## Tasks / Subtasks

- [x] Task 1 — Extend `SectorScore` domain type (AC: #1)
  - [x] Edit `src/lib/server/contexts/scoring/domain/sector-score.ts`
  - [x] Add `punctualScore: number` and `structuralScore: number` fields to the `SectorScore` interface
  - [x] No imports to add — domain stays pure

- [x] Task 2 — Update `ComputeDailyScoresUseCase` to compute sub-scores (AC: #2, #3, #4)
  - [x] Edit `src/lib/server/contexts/scoring/application/use-cases/compute-daily-scores.use-case.ts`
  - [x] In the sector reduce loop, split impacts by `impactType` before summing
  - [x] Compute `punctualScore` and `structuralScore` separately, then derive `score = punctualScore + structuralScore`
  - [x] Pass all three fields to `sectorScoreRepo.upsert({ date, sector, score, punctualScore, structuralScore })`

- [x] Task 3 — Update `FakeSectorScoreRepository` (AC: #8)
  - [x] Edit `src/lib/server/contexts/scoring/infrastructure/fakes/fake-sector-score.repository.ts`
  - [x] The `upsert` and `findLatest` methods already accept/return `SectorScore` — no logic change needed, just TS type propagation

- [x] Task 4 — Update DB schema and generate migration (AC: #5, #7)
  - [x] Edit `src/lib/server/contexts/scoring/infrastructure/db/sector-score.schema.ts`
  - [x] Add `punctualScore: real('punctual_score').notNull().default(0)` and `structuralScore: real('structural_score').notNull().default(0)`
  - [x] Run `npx drizzle-kit generate` to create migration file (`0002_bizarre_whistler.sql`)
  - [x] Run `npx drizzle-kit push` against the Neon DB to apply (migrate hangs with this Neon config — push used instead)

- [x] Task 5 — Update `DrizzleSectorScoreRepository` (AC: #5, #6)
  - [x] Edit `src/lib/server/contexts/scoring/infrastructure/db/sector-score.repository.ts`
  - [x] `upsert()`: add `punctualScore` and `structuralScore` to `.values()` and `onConflictDoUpdate.set`
  - [x] `findLatest()`: map `row.punctualScore` and `row.structuralScore` in the returned objects

- [x] Task 6 — Update unit tests for `ComputeDailyScoresUseCase` (AC: #8)
  - [x] Edit `src/lib/server/contexts/scoring/application/use-cases/compute-daily-scores.use-case.test.ts`
  - [x] Add test: PUNCTUAL-only sector → `structuralScore === 0`, `punctualScore > 0`
  - [x] Add test: STRUCTURAL-only sector → `punctualScore === 0`, `structuralScore > 0`
  - [x] Add test: mixed sector → `score ≈ punctualScore + structuralScore`
  - [x] Update existing tests that assert on `SectorScore` shape to include the new fields

## Dev Notes

### 1. Domain change — what to edit in `sector-score.ts`

```typescript
// src/lib/server/contexts/scoring/domain/sector-score.ts
import type { Sector } from '../../news/domain/sector';

export interface SectorScore {
  date: Date;
  sector: Sector;
  score: number;          // composite = punctualScore + structuralScore
  punctualScore: number;  // Σ decayed PUNCTUAL impacts
  structuralScore: number; // Σ decayed STRUCTURAL impacts
}
```

Zero imports to add. Domain stays pure.

### 2. Use case — how to split the reduce loop

Current pattern:
```typescript
const score = sectorImpacts.reduce((sum, impact) => {
  const ageInDays = (date.getTime() - impact.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
  return sum + computeDecay(impact.impactScore, impact.impactType, ageInDays);
}, 0);
await this.sectorScoreRepo.upsert({ date, sector, score });
```

New pattern:
```typescript
import { ImpactType } from '$lib/server/contexts/news/domain/impact-type';

let punctualScore = 0;
let structuralScore = 0;

for (const impact of sectorImpacts) {
  const ageInDays = (date.getTime() - impact.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
  const decayed = computeDecay(impact.impactScore, impact.impactType, ageInDays);
  if (impact.impactType === ImpactType.PUNCTUAL) {
    punctualScore += decayed;
  } else {
    structuralScore += decayed;
  }
}

const score = punctualScore + structuralScore;
await this.sectorScoreRepo.upsert({ date, sector, score, punctualScore, structuralScore });
```

`ImpactType` is already imported indirectly via `NewsImpactForScoring` — import it explicitly from `$lib/server/contexts/news/domain/impact-type`.

### 3. DB schema change — Drizzle columns to add

```typescript
// sector-score.schema.ts — add these two columns
punctualScore: real('punctual_score').notNull().default(0),
structuralScore: real('structural_score').notNull().default(0),
```

`DEFAULT 0` ensures backward compatibility with any existing rows (warm-up period data).

### 4. Repository upsert and findLatest update

```typescript
// upsert() — values and conflict update
.values({
  date: dateStr,
  sector: score.sector,
  score: score.score,
  punctualScore: score.punctualScore,
  structuralScore: score.structuralScore,
})
.onConflictDoUpdate({
  target: [sectorScoresTable.date, sectorScoresTable.sector],
  set: {
    score: score.score,
    punctualScore: score.punctualScore,
    structuralScore: score.structuralScore,
  },
});

// findLatest() — map new fields
return rows.map((row) => ({
  date: new Date(row.date),
  sector: row.sector as Sector,
  score: row.score,
  punctualScore: row.punctualScore,
  structuralScore: row.structuralScore,
}));
```

### 5. FakeSectorScoreRepository — no logic change needed

`FakeSectorScoreRepository` uses `SectorScore` type via TypeScript. Once the domain interface is extended (Task 1), TypeScript will flag any call sites that pass an incomplete object. The fake's internal `Map<string, SectorScore>` and methods work without modification — just ensure tests pass proper objects with the new fields.

### 6. Migration workflow

```bash
# Generate migration
npx drizzle-kit generate

# Apply to Neon DB (check .env for DATABASE_URL)
npx drizzle-kit migrate
```

The migration adds two nullable `real` columns with `DEFAULT 0`. Existing rows will have `punctual_score = 0` and `structural_score = 0` (acceptable — they will be overwritten on next pipeline run).

### 7. Files to modify

| File | Action |
|---|---|
| `src/lib/server/contexts/scoring/domain/sector-score.ts` | EDIT — add 2 fields |
| `src/lib/server/contexts/scoring/application/use-cases/compute-daily-scores.use-case.ts` | EDIT — split reduce loop |
| `src/lib/server/contexts/scoring/application/use-cases/compute-daily-scores.use-case.test.ts` | EDIT — add 3 tests, update existing |
| `src/lib/server/contexts/scoring/infrastructure/db/sector-score.schema.ts` | EDIT — add 2 columns |
| `src/lib/server/contexts/scoring/infrastructure/db/sector-score.repository.ts` | EDIT — upsert + findLatest |
| `src/lib/server/contexts/scoring/infrastructure/fakes/fake-sector-score.repository.ts` | CHECK — TS will flag if needed |
| `drizzle/migrations/` | GENERATED — new migration file from `drizzle-kit generate` |

### 8. Files NOT to touch

- `src/lib/server/contexts/scoring/application/ports/sector-score.repository.port.ts` — port passes `SectorScore` by type, propagates automatically
- `src/lib/server/contexts/scoring/application/use-cases/get-sector-dashboard.use-case.ts` — reads via port, no change
- `src/routes/api/sector-scores/+server.ts` — returns `SectorScore[]` directly, new fields flow through automatically
- Anything in `contexts/news/` — do NOT touch
- Story 4.2 will consume `punctualScore` and `structuralScore` directly from `SectorScore` — no adapter needed

### 9. Architecture compliance

- Domain (`sector-score.ts`) — zero external imports ✅
- Use case imports `ImpactType` from `contexts/news/domain/` — allowed (domain-to-domain type import at application layer, no business logic from news context) ✅
- No new cross-context service calls — scoring context stays self-contained ✅
- `FakeSectorScoreRepository` stays in `infrastructure/fakes/` — tests never hit the DB ✅

### References

- `src/lib/server/contexts/scoring/domain/sector-score.ts` — current type to extend
- `src/lib/server/contexts/scoring/application/use-cases/compute-daily-scores.use-case.ts` — loop to refactor
- `src/lib/server/contexts/scoring/infrastructure/db/sector-score.schema.ts` — schema to extend
- `src/lib/server/contexts/scoring/infrastructure/db/sector-score.repository.ts` — upsert/findLatest to update
- Story 3.1 dev notes — import alias convention (`$lib/server/...`), fake patterns
- Story 4.2 (`4-2-sector-score-card-component.md`) — consumer of the new fields; after this story, story 4.2 removes its fallback hack

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Extended `SectorScore` interface with `punctualScore` and `structuralScore` (domain layer, zero imports added).
- Refactored `ComputeDailyScoresUseCase`: replaced single `reduce` with a `for` loop splitting impacts by `ImpactType`. Added `ImpactType` import. Composite `score = punctualScore + structuralScore`.
- `FakeSectorScoreRepository`: no logic change — TS type propagation automatic. Updated 4 test call sites in `fake-sector-score.repository.test.ts` and 2 in `get-sector-dashboard.use-case.test.ts` to include new fields.
- Drizzle schema: added `punctual_score` and `structural_score` columns (`real NOT NULL DEFAULT 0`). Migration `0002_bizarre_whistler.sql` generated. **Manual `npx drizzle-kit migrate` required** (hook blocks .env access in CI).
- `DrizzleSectorScoreRepository`: `upsert()` and `findLatest()` updated with new fields. Used `?? 0` fallback in `findLatest()` for safety with existing rows before migration.
- Added 3 new unit tests (PUNCTUAL-only, STRUCTURAL-only, mixed). Suite: 66/66 passing, zero regressions.

### File List

- `src/lib/server/contexts/scoring/domain/sector-score.ts` (modified)
- `src/lib/server/contexts/scoring/application/use-cases/compute-daily-scores.use-case.ts` (modified)
- `src/lib/server/contexts/scoring/application/use-cases/compute-daily-scores.use-case.test.ts` (modified)
- `src/lib/server/contexts/scoring/application/use-cases/get-sector-dashboard.use-case.test.ts` (modified)
- `src/lib/server/contexts/scoring/infrastructure/db/sector-score.schema.ts` (modified)
- `src/lib/server/contexts/scoring/infrastructure/db/sector-score.repository.ts` (modified)
- `src/lib/server/contexts/scoring/infrastructure/fakes/fake-sector-score.repository.test.ts` (modified)
- `drizzle/migrations/0002_bizarre_whistler.sql` (generated)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated: 3-4 → review)
- `_bmad-output/implementation-artifacts/3-4-sector-score-sub-scores.md` (story updated)

## Change Log

- 2026-03-19: Story 3.4 implemented — SectorScore sub-scores (punctualScore, structuralScore), ComputeDailyScoresUseCase refactored, DrizzleSectorScoreRepository updated, DB migration generated, 3 new unit tests (66/66 green)
