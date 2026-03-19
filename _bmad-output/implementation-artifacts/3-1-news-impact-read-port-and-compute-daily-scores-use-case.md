# Story 3.1: NewsImpact read port & ComputeDailyScoresUseCase

Status: review

## Story

As a developer,
I want a `NewsImpactReadPort` owned by the scoring context and a `ComputeDailyScoresUseCase` that reads all impacts, applies the decay model, and upserts sector scores,
so that the scoring engine is fully decoupled from the news context and produces a fresh daily snapshot.

## Acceptance Criteria

1. **Given** `news-impact.read.port.ts` is defined in `contexts/scoring/application/ports/`
   **When** imported from within the scoring context
   **Then** it exposes `findAllImpacts(): Promise<NewsImpactForScoring[]>` — read-only, owned by scoring, no write capability
   **And** `NewsImpactForScoring` includes `publishedAt: Date` (required by the decay formula to compute age)

2. **Given** `ComputeDailyScoresUseCase` is constructed with `NewsImpactReadPort` and `SectorScoreRepositoryPort`
   **When** `execute(date: Date)` is called
   **Then** it reads all `NewsImpactForScoring` records via the read port
   **And** groups them by sector
   **And** for each sector, computes `Score = Σ impactScore_i × e^(-λ_i × ageInDays_i)` where λ depends on `impactType`
   **And** upserts one `SectorScore` per sector for the given date

3. **Given** the event store contains zero impacts for a sector
   **When** `execute()` runs
   **Then** that sector is omitted — no zero-score entry is written for sectors with no data

4. **Given** unit tests use `FakeNewsImpactReadRepository` and `FakeSectorScoreRepository`
   **When** vitest runs
   **Then** tests verify: correct decay formula per impact type, multi-sector aggregation, idempotency (calling execute twice for same date = same result)

5. **Given** a `DrizzleNewsImpactReadRepository` exists in `contexts/scoring/infrastructure/db/`
   **When** `findAllImpacts()` is called
   **Then** it performs a JOIN between `news_impacts` and `news` tables to retrieve `publishedAt`
   **And** returns `NewsImpactForScoring[]` with snake_case → camelCase mapping applied

## Tasks / Subtasks

- [x] Task 1: Define `NewsImpactForScoring` type and `NewsImpactReadPort` in scoring application ports (AC: #1)
  - [x] Create `src/lib/server/contexts/scoring/application/ports/news-impact.read.port.ts`
  - [x] Define `NewsImpactForScoring` interface: `{ id, newsId, sector: Sector, impactScore: number, impactType: ImpactType, publishedAt: Date }`
  - [x] Define `NewsImpactReadPort` interface: `{ findAllImpacts(): Promise<NewsImpactForScoring[]> }`
  - [x] Import `Sector` from `contexts/news/domain/sector` and `ImpactType` from `contexts/news/domain/impact-type` (cross-domain type imports at port level are allowed — no business logic, just type sharing)

- [x] Task 2: Implement `ComputeDailyScoresUseCase` (AC: #2, #3)
  - [x] File: `src/lib/server/contexts/scoring/application/use-cases/compute-daily-scores.use-case.ts` (currently empty — fill it)
  - [x] Constructor: `(newsImpactReadPort: NewsImpactReadPort, sectorScoreRepo: SectorScoreRepositoryPort)`
  - [x] `execute(date: Date): Promise<void>` — reads all impacts, groups by sector, computes decay score, upserts each sector
  - [x] Age computation: `ageInDays = (date.getTime() - impact.publishedAt.getTime()) / (1000 * 60 * 60 * 24)`
  - [x] Call `computeDecay(impact.impactScore, impact.impactType, ageInDays)` from `contexts/scoring/domain/decay-model.ts`
  - [x] For each sector with at least one impact: `sectorScoreRepo.upsert({ date, sector, score })`
  - [x] Log: `[PIPELINE] scoring: N sector scores computed` after all upserts
  - [x] Sectors with zero impacts are omitted (no upsert)

- [x] Task 3: Write unit tests for `ComputeDailyScoresUseCase` (AC: #4)
  - [x] File: `src/lib/server/contexts/scoring/application/use-cases/compute-daily-scores.use-case.test.ts`
  - [x] Use `FakeNewsImpactReadRepository` (new fake — see Task 5) and existing `FakeSectorScoreRepository`
  - [x] Test: STRUCTURAL impact decays slower than PUNCTUAL for same input score and age
  - [x] Test: multi-sector aggregation — two impacts in different sectors → two `SectorScore` upserts
  - [x] Test: idempotency — calling `execute()` twice for same date produces same scores
  - [x] Test: empty impacts → `findLatest()` returns `[]` (no upserts called)
  - [x] Test: age=0 → score equals raw impactScore (no decay at day 0)

- [x] Task 4: Implement `DrizzleNewsImpactReadRepository` in scoring infrastructure (AC: #5)
  - [x] Create directory `src/lib/server/contexts/scoring/infrastructure/db/` (may already exist)
  - [x] File: `src/lib/server/contexts/scoring/infrastructure/db/news-impact.read.repository.ts`
  - [x] Import `db` from `$lib/server/shared/db/client`
  - [x] Import `newsTable` and `newsImpactsTable` from `contexts/news/infrastructure/db/news-impact.schema` (infrastructure-to-infrastructure import — acceptable, both are infra layer)
  - [x] `findAllImpacts()`: `db.select(...).from(newsImpactsTable).innerJoin(newsTable, eq(newsImpactsTable.newsId, newsTable.id))`
  - [x] Map result to `NewsImpactForScoring`: apply camelCase mapping, cast `sector as Sector`, cast `impactType as ImpactType`

- [x] Task 5: Create `FakeNewsImpactReadRepository` in scoring fakes (AC: #4)
  - [x] File: `src/lib/server/contexts/scoring/infrastructure/fakes/fake-news-impact-read.repository.ts`
  - [x] Implements `NewsImpactReadPort`
  - [x] Public field: `impacts: NewsImpactForScoring[] = []`
  - [x] `findAllImpacts()` returns `[...this.impacts]`

## Dev Notes

### Critical Architecture Decision: Why a new `NewsImpactReadPort` in scoring?

The `contexts/news/application/ports/news-impact.repository.port.ts` already exposes `findAllImpacts(): Promise<NewsImpact[]>`. **Do NOT reuse it from the scoring context.** Architecture rule: `contexts/scoring/` MUST NOT import from `contexts/news/application/`. Each context owns its ports.

The scoring context defines its own `NewsImpactReadPort` with `NewsImpactForScoring` — a read-only projection that includes `publishedAt: Date`. This date is absent from the news context's `NewsImpact` type (which only has `id, newsId, sector, impactScore, impactType`).

### Why `publishedAt` is missing from `NewsImpact`

The news domain model (`news-impact.ts`) does not contain `publishedAt` — that field lives on the `News` aggregate. The `DrizzleNewsImpactRepository.findAllImpacts()` only queries the `news_impacts` table (no join). The scoring infrastructure adapter must JOIN `news_impacts` with `news` to retrieve `publishedAt`.

### File Map: What Exists vs What to Create

```
src/lib/server/contexts/scoring/
├── domain/
│   ├── sector-score.ts          ✅ EXISTS — SectorScore { date, sector, score }
│   ├── decay-model.ts           ✅ EXISTS — computeDecay(score, type, ageInDays), LAMBDA_STRUCTURAL=0.05, LAMBDA_PUNCTUAL=0.3
│   └── decay-model.test.ts      ✅ EXISTS
├── application/
│   ├── ports/
│   │   ├── sector-score.repository.port.ts  ✅ EXISTS — { upsert, findLatest }
│   │   └── news-impact.read.port.ts         ❌ CREATE — NewsImpactForScoring + NewsImpactReadPort
│   └── use-cases/
│       ├── compute-daily-scores.use-case.ts       ⚠️ EXISTS BUT EMPTY (1 line) — implement it
│       ├── compute-daily-scores.use-case.test.ts  ❌ CREATE
│       └── get-sector-dashboard.use-case.ts       ✅ EXISTS (story 3.2 — do NOT touch)
└── infrastructure/
    ├── db/
    │   ├── sector-score.schema.ts              ✅ EXISTS
    │   ├── sector-score.repository.ts          ✅ EXISTS
    │   ├── sector-score.repository.integration.test.ts  ✅ EXISTS
    │   └── news-impact.read.repository.ts      ❌ CREATE
    └── fakes/
        ├── fake-sector-score.repository.ts     ✅ EXISTS
        ├── fake-sector-score.repository.test.ts ✅ EXISTS
        └── fake-news-impact-read.repository.ts  ❌ CREATE
```

**Do NOT touch** any file in `contexts/news/` — Epic 2 is complete (status: review).
**Do NOT touch** `get-sector-dashboard.use-case.ts` — that is Story 3.2.

### Exact Interface Definitions

```typescript
// src/lib/server/contexts/scoring/application/ports/news-impact.read.port.ts
import type { Sector } from '$lib/server/contexts/news/domain/sector';
import type { ImpactType } from '$lib/server/contexts/news/domain/impact-type';

export interface NewsImpactForScoring {
  id: string;
  newsId: string;
  sector: Sector;
  impactScore: number;
  impactType: ImpactType;
  publishedAt: Date; // ← key addition vs NewsImpact domain type
}

export interface NewsImpactReadPort {
  findAllImpacts(): Promise<NewsImpactForScoring[]>;
}
```

### ComputeDailyScoresUseCase — Core Logic Pattern

```typescript
// src/lib/server/contexts/scoring/application/use-cases/compute-daily-scores.use-case.ts
import type { NewsImpactReadPort } from '../ports/news-impact.read.port';
import type { SectorScoreRepositoryPort } from '../ports/sector-score.repository.port';
import type { SectorScore } from '../../domain/sector-score';
import { computeDecay } from '../../domain/decay-model';
import type { Sector } from '$lib/server/contexts/news/domain/sector';

export class ComputeDailyScoresUseCase {
  constructor(
    private readonly newsImpactReadPort: NewsImpactReadPort,
    private readonly sectorScoreRepo: SectorScoreRepositoryPort
  ) {}

  async execute(date: Date): Promise<void> {
    const impacts = await this.newsImpactReadPort.findAllImpacts();

    // Group by sector
    const bySector = new Map<Sector, typeof impacts>();
    for (const impact of impacts) {
      const existing = bySector.get(impact.sector) ?? [];
      bySector.set(impact.sector, [...existing, impact]);
    }

    // Compute and upsert one score per sector
    for (const [sector, sectorImpacts] of bySector) {
      const score = sectorImpacts.reduce((sum, impact) => {
        const ageInDays = (date.getTime() - impact.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
        return sum + computeDecay(impact.impactScore, impact.impactType, ageInDays);
      }, 0);
      await this.sectorScoreRepo.upsert({ date, sector, score });
    }

    console.log(`[PIPELINE] scoring: ${bySector.size} sector scores computed`);
  }
}
```

### DrizzleNewsImpactReadRepository — Key JOIN Pattern

```typescript
// src/lib/server/contexts/scoring/infrastructure/db/news-impact.read.repository.ts
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/shared/db/client';
import { newsTable, newsImpactsTable } from '$lib/server/contexts/news/infrastructure/db/news-impact.schema';
import type { NewsImpactReadPort, NewsImpactForScoring } from '../../application/ports/news-impact.read.port';
import type { Sector } from '$lib/server/contexts/news/domain/sector';
import type { ImpactType } from '$lib/server/contexts/news/domain/impact-type';

export class DrizzleNewsImpactReadRepository implements NewsImpactReadPort {
  async findAllImpacts(): Promise<NewsImpactForScoring[]> {
    const rows = await db
      .select({
        id: newsImpactsTable.id,
        newsId: newsImpactsTable.newsId,
        sector: newsImpactsTable.sector,
        impactScore: newsImpactsTable.impactScore,
        impactType: newsImpactsTable.impactType,
        publishedAt: newsTable.publishedAt,
      })
      .from(newsImpactsTable)
      .innerJoin(newsTable, eq(newsImpactsTable.newsId, newsTable.id));

    return rows.map((row) => ({
      id: row.id,
      newsId: row.newsId,
      sector: row.sector as Sector,
      impactScore: row.impactScore,
      impactType: row.impactType as ImpactType,
      publishedAt: row.publishedAt,
    }));
  }
}
```

### Decay Model Values (already in domain)

```typescript
// decay-model.ts — already implemented, do not modify
LAMBDA_STRUCTURAL = 0.05  // ~14-day half-life
LAMBDA_PUNCTUAL = 0.3     // ~2.3-day half-life
// Formula: impactScore × e^(-λ × ageInDays)
```

### Import Alias Convention

Previous story (2.4) debug log: use `$lib/server/...` alias (not relative paths) for cross-context imports. The `run-daily-pipeline.use-case.ts` already uses this pattern. Follow it in `news-impact.read.port.ts` for imports of `Sector` and `ImpactType`.

### Testing Pattern — FakeNewsImpactReadRepository

```typescript
// src/lib/server/contexts/scoring/infrastructure/fakes/fake-news-impact-read.repository.ts
import type { NewsImpactReadPort, NewsImpactForScoring } from '../../application/ports/news-impact.read.port';

export class FakeNewsImpactReadRepository implements NewsImpactReadPort {
  public impacts: NewsImpactForScoring[] = [];

  async findAllImpacts(): Promise<NewsImpactForScoring[]> {
    return [...this.impacts];
  }
}
```

### Architecture Compliance Checklist

- ✅ `contexts/scoring/application/` imports only own domain + own ports
- ✅ `contexts/scoring/infrastructure/` imports own domain + infra (schema from news infra is allowed — infra-to-infra)
- ✅ No import of `contexts/news/application/` from `contexts/scoring/`
- ✅ `db` singleton from `shared/db/client.ts` — never instantiate a new connection
- ✅ camelCase ↔ snake_case mapping at repository boundary
- ✅ No business logic in infrastructure adapters
- ✅ Logging format: `[PIPELINE] scoring: N sector scores computed`

### No New DB Migration Needed

This story adds no new tables. The `DrizzleNewsImpactReadRepository` reads existing `news` + `news_impacts` tables (both created in Epic 1). No `drizzle-kit generate` required.

### Project Structure Notes

- `compute-daily-scores.use-case.ts` already exists but is empty — implement it directly (do not create a new file)
- `src/lib/server/contexts/scoring/infrastructure/db/` directory already exists (confirmed by `sector-score.repository.ts`)
- `src/lib/server/contexts/scoring/infrastructure/fakes/` directory already exists (confirmed by `fake-sector-score.repository.ts`)

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md` — Dependency Rules, Cross-Context Pattern, Enforcement Guidelines
- Epics: `_bmad-output/planning-artifacts/epics.md` — Story 3.1 acceptance criteria
- `contexts/scoring/domain/decay-model.ts` — `computeDecay()`, `LAMBDA_STRUCTURAL`, `LAMBDA_PUNCTUAL`
- `contexts/scoring/application/ports/sector-score.repository.port.ts` — `SectorScoreRepositoryPort`
- `contexts/scoring/infrastructure/fakes/fake-sector-score.repository.ts` — existing fake pattern to follow
- `contexts/news/domain/news-impact.ts` — `NewsImpact` type (note: no `publishedAt` — this is why scoring needs its own port type)
- `contexts/news/infrastructure/db/news-impact.repository.ts` — existing JOIN pattern reference
- Story 2.4 dev notes — `$lib/server/...` alias preferred over relative paths in cross-context imports

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Implemented all 5 tasks in one session. 5 unit tests added, 60/60 suite passes (no regressions).
- `NewsImpactReadPort` uses `$lib/server/...` alias for cross-context type imports (Sector, ImpactType) per story 2.4 convention.
- `DrizzleNewsImpactReadRepository` performs an `innerJoin` between `news_impacts` and `news` tables to retrieve `publishedAt`, absent from the news domain model.
- No new DB migration required — reads existing tables from Epic 1.

### File List

- `src/lib/server/contexts/scoring/application/ports/news-impact.read.port.ts` (new)
- `src/lib/server/contexts/scoring/application/use-cases/compute-daily-scores.use-case.ts` (implemented, was empty)
- `src/lib/server/contexts/scoring/application/use-cases/compute-daily-scores.use-case.test.ts` (new)
- `src/lib/server/contexts/scoring/infrastructure/db/news-impact.read.repository.ts` (new)
- `src/lib/server/contexts/scoring/infrastructure/fakes/fake-news-impact-read.repository.ts` (new)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated: 3-1 → review)
- `_bmad-output/implementation-artifacts/3-1-news-impact-read-port-and-compute-daily-scores-use-case.md` (story updated)

## Change Log

- 2026-03-19: Story 3.1 implemented — NewsImpactReadPort, ComputeDailyScoresUseCase, DrizzleNewsImpactReadRepository, FakeNewsImpactReadRepository, 5 unit tests (60/60 suite green)
