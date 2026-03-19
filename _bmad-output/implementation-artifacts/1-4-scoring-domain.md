# Story 1.4: Scoring Domain — SectorScore aggregate, DecayModel

Status: review

## Story

As a developer,
I want the `scoring` domain models (`SectorScore` aggregate, `DecayModel` with λ constants and the decay function) defined with zero external imports,
So that the scoring engine has a pure, testable mathematical foundation for Story 3.1's `ComputeDailyScoresUseCase`.

## Acceptance Criteria

1. **Given** `sector-score.ts` is imported
   **When** a `SectorScore` object is constructed
   **Then** it contains: `date: Date`, `sector: Sector`, `score: number` (unbounded)
   **And** the file has zero imports outside `domain/`

2. **Given** `decay-model.ts` defines the decay function and λ constants
   **When** `computeDecay(impactScore, impactType, ageInDays)` is called with a STRUCTURAL event
   **Then** the result decays slower than the same call with a PUNCTUAL event (λ_STRUCTURAL < λ_PUNCTUAL)
   **And** the formula used is `impactScore × e^(-λ × ageInDays)`

3. **Given** a unit test `decay-model.test.ts` exists
   **When** vitest runs
   **Then** it verifies: STRUCTURAL decay at day 7 > PUNCTUAL decay at day 7 for the same input score
   **And** it verifies: decay at day 0 = impact score (no decay applied)

## Tasks / Subtasks

- [x] Task 1: Implement `sector-score.ts` (AC: #1)
    - [x] Define `SectorScore` interface: `date: Date`, `sector: Sector`, `score: number`
    - [x] Import `Sector` type from `../../news/domain/sector` — this is the ONLY allowed import (same `domain/` family — see note below)
    - [x] File location: `src/lib/server/contexts/scoring/domain/sector-score.ts` (exists as empty stub — fill it)

- [x] Task 2: Implement `decay-model.ts` (AC: #2)
    - [x] Export `LAMBDA_STRUCTURAL` and `LAMBDA_PUNCTUAL` constants (number)
    - [x] Export `computeDecay(impactScore: number, impactType: ImpactType, ageInDays: number): number`
    - [x] Formula: `impactScore × Math.exp(-lambda × ageInDays)`
    - [x] Import `ImpactType` from `../../news/domain/impact-type` — allowed (domain types only)
    - [x] File location: `src/lib/server/contexts/scoring/domain/decay-model.ts` (exists as empty stub — fill it)

- [x] Task 3: Write unit tests `decay-model.test.ts` (AC: #3)
    - [x] File: `src/lib/server/contexts/scoring/domain/decay-model.test.ts` (create new)
    - [x] Tests: STRUCTURAL decay at day 7 > PUNCTUAL decay at day 7, decay at day 0 = impactScore, negative score decays correctly, ageInDays=30 approaches 0

## Dev Notes

### File Locations — What Exists vs What to Create

```
src/lib/server/contexts/scoring/
├── domain/
│   ├── sector-score.ts              ← EXISTS AS EMPTY STUB — fill it
│   ├── decay-model.ts               ← EXISTS AS EMPTY STUB — fill it
│   └── decay-model.test.ts          ← CREATE NEW (co-located with domain file)
├── application/
│   └── ports/
│       └── sector-score.repository.port.ts  ← EXISTS AS EMPTY STUB — do NOT touch (Story 1.5)
└── infrastructure/
    └── db/
        └── sector-score.repository.ts       ← EXISTS AS EMPTY STUB — do NOT touch (Story 1.5)
```

Do NOT touch `sector-score.repository.port.ts`, `sector-score.repository.ts`, `compute-daily-scores.use-case.ts`, `get-sector-dashboard.use-case.ts` — those belong to Stories 1.5, 3.1, and 3.2.

### Cross-Context Import — `Sector` and `ImpactType`

The scoring domain needs `Sector` (defined in `news` domain) and `ImpactType` (defined in `news` domain). This is an intentional, documented cross-domain type import at the **domain level** — these are shared value types, not cross-context use case orchestration.

Architecture rule: `contexts/scoring/` must NOT import from `contexts/news/` **in use cases or infrastructure**. But in the **domain layer**, importing shared value types (`Sector`, `ImpactType`) is acceptable per the epics file's intent — these enums are effectively shared kernel types.

```typescript
// sector-score.ts — allowed domain import
import type { Sector } from '../../news/domain/sector';

// decay-model.ts — allowed domain import
import type { ImpactType } from '../../news/domain/impact-type';
```

**Why not duplicate?** Duplicating `Sector` in the scoring context would create divergence risk — the LLM classifier produces `Sector` values that must match exactly what `SectorScore` groups by. One source of truth.

### SectorScore — Exact Pattern

```typescript
// src/lib/server/contexts/scoring/domain/sector-score.ts
import type { Sector } from '../../news/domain/sector';

export interface SectorScore {
    date: Date;
    sector: Sector;
    score: number; // unbounded — computed as sum of decayed impacts, can exceed [-1, 1]
}
```

**Why unbounded `score`?** The decay-weighted sum `Σ impactScore_i × e^(-λ × age_i)` accumulates across all historical impacts — many positive events can push the score well above 1. The score is a relative conviction indicator, not a normalized value.

### DecayModel — Exact Pattern

```typescript
// src/lib/server/contexts/scoring/domain/decay-model.ts
import { ImpactType } from '../../news/domain/impact-type';

// λ_STRUCTURAL: slow decay — structural impacts last weeks/months
// λ_PUNCTUAL: fast decay — punctual impacts fade in days
export const LAMBDA_STRUCTURAL = 0.05; // ~20-day half-life
export const LAMBDA_PUNCTUAL = 0.3; // ~2-day half-life

export function computeDecay(
    impactScore: number,
    impactType: ImpactType,
    ageInDays: number
): number {
    const lambda = impactType === ImpactType.STRUCTURAL ? LAMBDA_STRUCTURAL : LAMBDA_PUNCTUAL;
    return impactScore * Math.exp(-lambda * ageInDays);
}
```

**Why these λ values?**

- `LAMBDA_STRUCTURAL = 0.05` → half-life ≈ 14 days (`ln(2)/0.05 ≈ 14`) — structural shifts (regulation, mergers) retain relevance for 1–3 weeks
- `LAMBDA_PUNCTUAL = 0.3` → half-life ≈ 2.3 days (`ln(2)/0.3 ≈ 2.3`) — punctual events (earnings miss, CEO statement) fade quickly
- These are initial calibration values — can be tuned later without changing the interface

**Formula:** `impactScore × e^(-λ × ageInDays)` — standard exponential decay. `ageInDays = 0` → result = `impactScore` (no decay). `ageInDays → ∞` → result → 0.

### Unit Tests — Exact Pattern

```typescript
// src/lib/server/contexts/scoring/domain/decay-model.test.ts
import { describe, it, expect } from 'vitest';
import { computeDecay, LAMBDA_STRUCTURAL, LAMBDA_PUNCTUAL } from './decay-model';
import { ImpactType } from '../../news/domain/impact-type';

describe('computeDecay', () => {
    it('applies no decay at age 0', () => {
        expect(computeDecay(0.8, ImpactType.STRUCTURAL, 0)).toBeCloseTo(0.8);
        expect(computeDecay(0.8, ImpactType.PUNCTUAL, 0)).toBeCloseTo(0.8);
    });

    it('STRUCTURAL decays slower than PUNCTUAL at day 7', () => {
        const structural = computeDecay(1.0, ImpactType.STRUCTURAL, 7);
        const punctual = computeDecay(1.0, ImpactType.PUNCTUAL, 7);
        expect(structural).toBeGreaterThan(punctual);
    });

    it('decay approaches 0 for large age', () => {
        expect(computeDecay(1.0, ImpactType.STRUCTURAL, 200)).toBeCloseTo(0, 5);
        expect(computeDecay(1.0, ImpactType.PUNCTUAL, 200)).toBeCloseTo(0, 5);
    });

    it('handles negative impact scores', () => {
        const result = computeDecay(-0.5, ImpactType.STRUCTURAL, 0);
        expect(result).toBeCloseTo(-0.5);
    });
});
```

### Architecture Compliance Checklist

- ✅ `sector-score.ts` is in `contexts/scoring/domain/` — zero external imports except shared value types (`Sector`)
- ✅ `decay-model.ts` is in `contexts/scoring/domain/` — imports `ImpactType` from news domain (value type only)
- ✅ `decay-model.test.ts` is co-located with the domain file
- ❌ NEVER import Drizzle, `$lib/server/shared/db`, or any infrastructure in domain files
- ❌ NEVER import application or use case files from domain files
- ❌ NEVER add business logic or validation beyond the decay formula (no clamping, no normalization)

### ImpactType Import — `import` vs `import type`

Use a **value import** (not `import type`) for `ImpactType` in `decay-model.ts` because `ImpactType.STRUCTURAL` is used as a runtime value in the conditional:

```typescript
// CORRECT — value needed at runtime for comparison
import { ImpactType } from '../../news/domain/impact-type';

// WRONG — erased at runtime, ImpactType.STRUCTURAL would be undefined
import type { ImpactType } from '../../news/domain/impact-type';
```

For `sector-score.ts`, use `import type { Sector }` — it's only used as a type annotation, not a runtime value.

### Relationship with Other Stories

- **Story 1.2** (done): provided `Sector`, `ImpactType`, `NewsImpact` — import those types from `contexts/news/domain/`
- **Story 1.5** (next): will use `SectorScore` to define `SectorScoreRepositoryPort` and `DrizzleSectorScoreRepository`
- **Story 3.1**: `ComputeDailyScoresUseCase` will call `computeDecay()` — implement exactly the signature defined here
- **Story 4.2**: Dashboard will use `SectorScore.score` to determine card color (green/orange/red) — the `score` field is the output of this story's decay formula

### Patterns from Previous Stories

- Tests use `import { describe, it, expect } from 'vitest'` — no test runner setup, no `beforeEach` needed for pure functions
- Co-located tests: `decay-model.test.ts` next to `decay-model.ts` (not in a `__tests__/` folder)
- Run unit tests: `npm run test:unit`
- Domain files: TypeScript interfaces (not classes) for value objects and aggregates
- Enums: `as const` object + type alias pattern — `export const ImpactType = { ... } as const; export type ImpactType = ...` — already in `impact-type.ts` and `sector.ts`, follow the same pattern if you add any new types

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Test `decay approaches 0 for large age` échouait avec `ageInDays=200` et précision 5 pour STRUCTURAL (`e^(-0.05*200) ≈ 0.0000454` > seuil). Corrigé en utilisant `ageInDays=500` (STRUCTURAL) et `ageInDays=100` (PUNCTUAL) pour garantir la convergence vers 0 à 5 décimales.

### Completion Notes List

- ✅ Task 1: `sector-score.ts` — interface `SectorScore` avec `date`, `sector`, `score` ; `import type { Sector }` depuis news domain
- ✅ Task 2: `decay-model.ts` — `LAMBDA_STRUCTURAL=0.05`, `LAMBDA_PUNCTUAL=0.3`, `computeDecay()` avec formule `impactScore * Math.exp(-lambda * ageInDays)` ; `import { ImpactType }` (valeur runtime)
- ✅ Task 3: `decay-model.test.ts` — 6 tests unitaires : no decay at age 0, STRUCTURAL > PUNCTUAL at day 7, converge vers 0, score négatif, validation des λ exacts
- 31 tests passent (dont les 6 nouveaux), zéro régression

### File List

- `src/lib/server/contexts/scoring/domain/sector-score.ts` (créé — stub rempli)
- `src/lib/server/contexts/scoring/domain/decay-model.ts` (créé — stub rempli)
- `src/lib/server/contexts/scoring/domain/decay-model.test.ts` (créé)

## Change Log

- 2026-03-19: Story created by create-story workflow
- 2026-03-19: Story implemented by dev agent — SectorScore interface, DecayModel with λ constants and computeDecay(), 6 unit tests
