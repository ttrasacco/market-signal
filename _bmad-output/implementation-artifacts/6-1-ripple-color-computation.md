# Story 6.1: Ripple Color Computation — Inner & Outer Formula Update

Status: review

## Story

As a user,
I want the Ripple Cast colors to reflect normalized per-sector signals computed from the correct formulas,
so that the inner ring and outer ripples accurately encode the magnitude and historical accumulation of sectoral signals.

## Acceptance Criteria

1. **Given** `GetLatestSectorScoresUseCase.execute()` returns `SectorScoreView[]`
   **When** `innerScore` is computed for a sector
   **Then** `innerScore = (punctualScore + structuralScore) / newsCount`
   **And** `innerScore = 0` when `newsCount === 0`

2. **Given** `GetLatestSectorScoresUseCase.execute()` returns `SectorScoreView[]`
   **When** `outerScore` is computed for a sector
   **Then** `outerScore = ∑((punctualScore + structuralScore) / newsCount)` across **all historical snapshots of that sector**
   **And** each snapshot's normalized score is `(punctualScore + structuralScore) / newsCount` (0 when `newsCount === 0`)
   **And** `outerScore` is a **sum**, not a mean

3. **Given** a sector has only one historical snapshot (today only)
   **When** `outerScore` is computed
   **Then** `outerScore === innerScore`

4. **Given** unit tests in `get-latest-sector-scores.use-case.test.ts`
   **When** vitest runs
   **Then** all existing tests pass or are updated to reflect the new `outerScore` formula
   **And** a new test verifies `outerScore` is the sum (not mean) of normalized historical scores

## Tasks / Subtasks

- [x] Task 1 — Update `outerScore` formula in `GetLatestSectorScoresUseCase` (AC: #2, #3)
  - [x] Edit `src/lib/server/contexts/scoring/application/use-cases/get-latest-sector-scores.use-case.ts`
  - [x] Change `outerScore = sum / historical.length` → `outerScore = sum` (remove the division)
  - [x] Keep `innerScore` formula unchanged: `(punctualScore + structuralScore) / newsCount`

- [x] Task 2 — Update unit tests (AC: #4)
  - [x] Edit `src/lib/server/contexts/scoring/application/use-cases/get-latest-sector-scores.use-case.test.ts`
  - [x] Update existing test `'computes outerScore as historical mean...'` to reflect sum semantics
  - [x] Add test: single snapshot → `outerScore === innerScore`
  - [x] Add test: two snapshots → `outerScore === normalizedScore(day1) + normalizedScore(day2)`

## Dev Notes

### 1. Current vs target formula

**Current** (`get-latest-sector-scores.use-case.ts`):
```typescript
const outerScore =
  historical.length > 0
    ? historical.reduce((sum, s) => sum + normalizedScore(s), 0) / historical.length
    : 0;
```

**Target:**
```typescript
const outerScore = historical.reduce((sum, s) => sum + normalizedScore(s), 0);
```

`innerScore` formula is unchanged:
```typescript
function normalizedScore(score: SectorScore): number {
  if (score.newsCount === 0) return 0;
  return (score.punctualScore + score.structuralScore) / score.newsCount;
}
```

### 2. What does NOT change

- `SectorScore` domain type — no modification
- `ComputeDailyScoresUseCase` — no modification (stores raw `punctualScore`, `structuralScore`, `newsCount`)
- DB schema / migration — no modification
- `SectorScoreCardData` type in `sector-score-card.utils.ts` — no modification
- `dashboard-layout.utils.ts` — no modification (uses `innerScore` for sorting/filtering, unchanged)
- `+page.server.ts` — no modification (maps `s.innerScore` and `s.outerScore`, unchanged)
- All Svelte components — no modification

### 3. File to edit

| File | Action |
|---|---|
| `src/lib/server/contexts/scoring/application/use-cases/get-latest-sector-scores.use-case.ts` | EDIT — remove `/ historical.length` |
| `src/lib/server/contexts/scoring/application/use-cases/get-latest-sector-scores.use-case.test.ts` | EDIT — update + add tests |

### 4. Test update example

Current test to update:
```typescript
it('computes outerScore as historical mean of normalized scores', async () => {
  // yesterday: (0.1+0.1)/2 = 0.1, today: (0.2+0.3)/2 = 0.25
  // current assertion: outerScore ≈ (0.1 + 0.25) / 2 = 0.175
  expect(result.outerScore).toBeCloseTo(0.175, 10);
});
```

Updated assertion:
```typescript
// outerScore = 0.1 + 0.25 = 0.35 (sum, not mean)
expect(result.outerScore).toBeCloseTo(0.35, 10);
```

### 5. Architecture compliance

- Change is confined to the application layer of `contexts/scoring/` — no domain changes, no infra changes
- `FakeSectorScoreAdapter` is unchanged — it already supports `findAll()` returning all historical entries
- No cross-context dependencies affected

### 6. Impact on Ripple Cast rendering

`+page.server.ts` calls `scoreToColor(s.outerScore)` to derive `outerColor`. With the sum formula, `outerScore` will accumulate over time as more days are scored. The `scoreToColor` thresholds (`±0.2`) remain unchanged — the visual will naturally shift more bullish/bearish as historical signal accumulates.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- Removed `/ historical.length` from `outerScore` computation — formula is now a pure cumulative sum of normalized historical scores.
- Updated JSDoc comment on `SectorScoreView.outerScore` to reflect "cumulative sum" semantics.
- Renamed existing test from `'computes outerScore as historical mean...'` to `'computes outerScore as cumulative sum...'` and updated assertion (0.175 → 0.35).
- Added 2 new tests: single-snapshot equality (`outerScore === innerScore`) and explicit two-snapshot sum verification.
- 127/127 tests pass, no regressions.

### File List

- src/lib/server/contexts/scoring/application/use-cases/get-latest-sector-scores.use-case.ts
- src/lib/server/contexts/scoring/application/use-cases/get-latest-sector-scores.use-case.test.ts

## Change Log

- 2026-03-19: Story created — change `outerScore` from historical mean to cumulative sum of normalized per-sector scores
- 2026-03-19: Implemented — removed division by `historical.length`; updated + added 3 unit tests; 127/127 tests pass
