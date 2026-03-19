# Story 1.2: News Domain — News aggregate, NewsImpact value object, ImpactType enum, Sector enum

Status: review

## Story

As a developer,
I want the `news` domain models (`News` aggregate, `NewsImpact` value object, `ImpactType` enum, `Sector` enum) defined with zero external imports,
so that the domain clearly represents that a single article can impact multiple sectors independently.

## Acceptance Criteria

1. **Given** `impact-type.ts` is imported
   **When** the type is used
   **Then** it exports `ImpactType` with values `STRUCTURAL` and `PUNCTUAL`

2. **Given** `sector.ts` is imported
   **When** the Sector type is used
   **Then** it covers at minimum 10 economic sectors: `TECHNOLOGY`, `ENERGY`, `HEALTHCARE`, `FINANCIALS`, `CONSUMER`, `INDUSTRIALS`, `MATERIALS`, `UTILITIES`, `REAL_ESTATE`, `COMMUNICATION`
   **And** the file has zero imports outside the `domain/` folder

3. **Given** `news-impact.ts` defines the `NewsImpact` value object
   **When** a `NewsImpact` is constructed
   **Then** it contains: `id`, `newsId` (FK to News), `sector: Sector`, `impactScore: number` (range [-1, 1]), `impactType: ImpactType`

4. **Given** `news.ts` defines the `News` aggregate
   **When** a `News` is constructed
   **Then** it contains: `id`, `publishedAt`, `analyzedAt`, `source`, `headline`
   **And** `News` does not directly contain sector/impactScore — those belong to `NewsImpact`

5. **Given** a unit test `news-impact.test.ts` exists
   **When** vitest runs
   **Then** it verifies that `impactScore` outside [-1, 1] is rejected
   **And** it verifies that an empty `headline` is rejected

## Tasks / Subtasks

- [x] Task 1: Create `impact-type.ts` (AC: #1)
  - [x] Define `ImpactType` as a TypeScript string enum or const object with `STRUCTURAL` and `PUNCTUAL`
  - [x] Zero imports

- [x] Task 2: Create `sector.ts` (AC: #2)
  - [x] Define `Sector` as a TypeScript string enum or const object with all 10 required values
  - [x] Zero imports
  - [x] Export both the enum/object and the derived `Sector` type

- [x] Task 3: Create `news-impact.ts` (AC: #3)
  - [x] Define `NewsImpact` interface/type with fields: `id: string`, `newsId: string`, `sector: Sector`, `impactScore: number`, `impactType: ImpactType`
  - [x] Import only from same `domain/` folder (`impact-type.ts` and `sector.ts`)
  - [x] No validation logic here — this is a pure value object / data shape

- [x] Task 4: Create `news.ts` (AC: #4)
  - [x] Define `News` interface/type with fields: `id: string`, `publishedAt: Date`, `analyzedAt: Date`, `source: string`, `headline: string`
  - [x] Zero imports (no Sector, no ImpactType — those are on NewsImpact)

- [x] Task 5: Write unit test `news-impact.test.ts` (AC: #5)
  - [x] Co-locate next to `news-impact.ts`
  - [x] Test: `impactScore` > 1 is rejected (validation helper or factory)
  - [x] Test: `impactScore` < -1 is rejected
  - [x] Test: empty `headline` is rejected
  - [x] Use a factory/builder or validation function that throws for invalid data

## Dev Notes

### Critical: Zero External Imports in Domain

Domain files **must have zero imports outside `domain/`**. This is a hard architecture rule.

```
✅ news-impact.ts may import from: impact-type.ts, sector.ts (same domain/ folder)
✅ news.ts may import: nothing (all primitives)
❌ domain files must NEVER import from application/, infrastructure/, shared/, $env/*, drizzle-orm, etc.
```

### Recommended TypeScript Patterns

**Enums via `const` object + type union (preferred over TypeScript `enum`):**

```typescript
// impact-type.ts
export const ImpactType = {
  STRUCTURAL: 'STRUCTURAL',
  PUNCTUAL: 'PUNCTUAL',
} as const;

export type ImpactType = (typeof ImpactType)[keyof typeof ImpactType];
```

```typescript
// sector.ts
export const Sector = {
  TECHNOLOGY: 'TECHNOLOGY',
  ENERGY: 'ENERGY',
  HEALTHCARE: 'HEALTHCARE',
  FINANCIALS: 'FINANCIALS',
  CONSUMER: 'CONSUMER',
  INDUSTRIALS: 'INDUSTRIALS',
  MATERIALS: 'MATERIALS',
  UTILITIES: 'UTILITIES',
  REAL_ESTATE: 'REAL_ESTATE',
  COMMUNICATION: 'COMMUNICATION',
} as const;

export type Sector = (typeof Sector)[keyof typeof Sector];
```

**Why `const` object over TypeScript `enum`:** string enums produce cleaner JSON serialization, are easier to use in Drizzle schema definitions (later stories), and avoid TypeScript enum pitfalls (numeric enum coercion, etc.). The `Sector` values must match the DB column strings exactly — they are stored as-is in the `sector` column.

### Value Object Design

`NewsImpact` is a **value object** — it has no lifecycle or behavior, it is just data. Define it as a TypeScript interface:

```typescript
// news-impact.ts
import type { Sector } from './sector';
import type { ImpactType } from './impact-type';

export interface NewsImpact {
  id: string;
  newsId: string;
  sector: Sector;
  impactScore: number; // range: [-1, 1]
  impactType: ImpactType;
}
```

`News` is an **aggregate root** — define as interface:

```typescript
// news.ts
export interface News {
  id: string;
  publishedAt: Date;
  analyzedAt: Date;
  source: string;
  headline: string;
}
```

`News` deliberately does NOT contain `NewsImpact[]` — the relationship is managed at the repository level (one `News` → many `NewsImpact`). This keeps domain objects flat and pure.

### Validation for Tests

The acceptance criteria require that `impactScore` outside [-1, 1] and empty `headline` are **rejected**. Since domain objects are plain interfaces (no constructor), add a **validation helper** in the test or as a factory function:

**Option A — Test-local validation (simplest):**
```typescript
// news-impact.test.ts
function createNewsImpact(overrides: Partial<NewsImpact>): NewsImpact {
  const impact: NewsImpact = {
    id: 'uuid-1',
    newsId: 'news-1',
    sector: Sector.TECHNOLOGY,
    impactScore: 0,
    impactType: ImpactType.PUNCTUAL,
    ...overrides,
  };
  if (impact.impactScore < -1 || impact.impactScore > 1) {
    throw new Error('impactScore must be in range [-1, 1]');
  }
  return impact;
}
```

**Option B — Domain validator (co-located):**
Add a `validateNewsImpact(impact: NewsImpact): void` function in `news-impact.ts` that throws if constraints are violated. Tests import and call this function.

**Option B is preferred** if the validator will be called at the repository boundary in Story 1.3. Otherwise Option A is fine for Story 1.2.

Likewise for `News` headline validation:
```typescript
function validateNews(news: News): void {
  if (!news.headline.trim()) throw new Error('headline must not be empty');
}
```

### File Locations

These files **already exist as empty stubs** in the repository (created during project scaffolding):

```
src/lib/server/contexts/news/domain/
├── impact-type.ts     ← exists, empty — fill it in
├── sector.ts          ← exists, empty — fill it in
├── news-impact.ts     ← exists, empty — fill it in
└── news.ts            ← does NOT exist yet — create it
```

**Note:** `news.ts` is NOT present in the current stubs. It must be created new.

Test file location (co-located unit tests):
```
src/lib/server/contexts/news/domain/
└── news-impact.test.ts   ← does NOT exist yet — create it
```

### Architecture Compliance

- All 4 domain files must import ONLY from within `src/lib/server/contexts/news/domain/`
- No `$env/static/private`, no drizzle, no SvelteKit imports
- `middleware/` and `decorators/` must NOT be touched in this story
- `shared/db/client.ts` already exists and must NOT be imported from domain files

### Relationship with Other Stories

- **Story 1.3** (next) will define `news-impact.schema.ts` (Drizzle table) and `DrizzleNewsImpactRepository` — it depends on the types exported by this story
- **Story 2.2** will define `AnthropicClassifier` — its return type `NewsClassification` uses `Sector` and `ImpactType` from this story
- **Story 3.1** (`ComputeDailyScoresUseCase`) imports `NewsImpact` and uses `impactType` to select the λ decay constant

### Patterns from Story 1.1 (Previous Story)

- Tests use `import { describe, it, expect } from 'vitest'` — no beforeEach setup needed for pure unit tests
- Tests are co-located next to source files (not in a separate `__tests__` folder)
- Run tests with: `npm run test:unit`
- No mocking or DB required for domain unit tests

### Testing Pattern

```typescript
// news-impact.test.ts
import { describe, it, expect } from 'vitest';
import type { NewsImpact } from './news-impact';
import { Sector } from './sector';
import { ImpactType } from './impact-type';
import { validateNewsImpact } from './news-impact'; // if using Option B

describe('NewsImpact validation', () => {
  it('accepts impactScore at boundary values -1 and 1', () => {
    expect(() => validateNewsImpact({ ..., impactScore: -1 })).not.toThrow();
    expect(() => validateNewsImpact({ ..., impactScore: 1 })).not.toThrow();
  });
  it('rejects impactScore > 1', () => {
    expect(() => validateNewsImpact({ ..., impactScore: 1.1 })).toThrow();
  });
  it('rejects impactScore < -1', () => {
    expect(() => validateNewsImpact({ ..., impactScore: -1.1 })).toThrow();
  });
});

describe('News validation', () => {
  it('rejects empty headline', () => {
    expect(() => validateNews({ ..., headline: '' })).toThrow();
    expect(() => validateNews({ ..., headline: '   ' })).toThrow();
  });
});
```

### Project Structure Notes

Files to fill / create in this story:
```
src/lib/server/contexts/news/domain/
├── impact-type.ts     ← fill in (currently empty)
├── sector.ts          ← fill in (currently empty)
├── news-impact.ts     ← fill in (currently empty) — also add validateNewsImpact()
├── news.ts            ← CREATE NEW — also add validateNews()
└── news-impact.test.ts ← CREATE NEW — co-located unit tests
```

No other files should be touched in this story. The following story (1.3) handles:
- `news-impact.schema.ts` (Drizzle table definitions)
- `news-impact.repository.port.ts` (port interface — currently an empty stub)
- `DrizzleNewsImpactRepository`
- Fakes

### References

- Epics: `_bmad-output/planning-artifacts/epics.md` — Story 1.2 acceptance criteria
- Architecture: `_bmad-output/planning-artifacts/architecture.md` — Naming Patterns, Structure Patterns, Dependency Rules, Anti-Patterns
- Architecture: `_bmad-output/planning-artifacts/architecture.md` — Context Boundaries (`contexts/news/` owns `NewsImpact`, `ImpactType`, `Sector`)
- Story 1.1: `_bmad-output/implementation-artifacts/1-1-shared-infrastructure-setup.md` — testing pattern (co-located, vitest)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No blockers encountered._

### Completion Notes List

- Implemented `impact-type.ts` with `const` object pattern (zero imports) — AC #1 ✅
- Implemented `sector.ts` with 10 sectors, `const` object pattern (zero imports) — AC #2 ✅
- Implemented `news-impact.ts` with `NewsImpact` interface + `validateNewsImpact()` co-located validator (Option B, preferred for Story 1.3 boundary use) — AC #3 ✅
- Created `news.ts` with `News` interface + `validateNews()` — AC #4 ✅
- Created `news-impact.test.ts` co-located, 8 tests covering boundary values, out-of-range scores, empty/whitespace headlines — AC #5 ✅
- All 19 unit tests pass (8 new + 11 from Story 1.1), zero regressions
- Architecture compliance verified: domain files only import from within `domain/`, no external deps

### File List

- `src/lib/server/contexts/news/domain/impact-type.ts` (modified — was empty stub)
- `src/lib/server/contexts/news/domain/sector.ts` (modified — was empty stub)
- `src/lib/server/contexts/news/domain/news-impact.ts` (modified — was empty stub)
- `src/lib/server/contexts/news/domain/news.ts` (created)
- `src/lib/server/contexts/news/domain/news-impact.test.ts` (created)

## Change Log

- 2026-03-19: Story 1.2 implemented — news domain models and validators (ImpactType, Sector, NewsImpact, News) with unit tests
