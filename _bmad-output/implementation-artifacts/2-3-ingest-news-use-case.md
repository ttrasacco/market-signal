# Story 2.3: IngestNewsUseCase — orchestration fetch → classify → persist

**Status:** review
**Epic:** 2 — Autonomous Daily Ingestion Pipeline
**Story ID:** 2-3

---

## Story

As a developer,
I want the `IngestNewsUseCase` that orchestrates RSS fetch → LLM classification → event store persistence,
So that a single use case call triggers the full ingestion pipeline for all configured feeds.

---

## Acceptance Criteria

1. **Given** `IngestNewsUseCase` is constructed with `RssFetcherPort`, `NewsClassifierPort`, `NewsImpactRepositoryPort`, and a list of feed URLs
   **When** `execute()` is called
   **Then** it fetches articles from all configured feeds
   **And** for each article, calls `classify(headline)` to get `NewsClassification[]`
   **And** creates one `News` + one `NewsImpact` per classification result
   **And** persists each `News` + its `NewsImpact[]` via the repository

2. **Given** the classifier throws for one article
   **When** `execute()` continues
   **Then** the failing article is skipped and logged with `console.error`
   **And** the pipeline continues processing remaining articles (no batch abort)

3. **Given** a feed URL is unreachable
   **When** `execute()` continues
   **Then** that feed is skipped and logged
   **And** other feeds are still processed

4. **Given** unit tests for `IngestNewsUseCase` use `FakeRssFetcher`, `FakeNewsClassifier`, `FakeNewsImpactRepository`
   **When** vitest runs
   **Then** tests verify: correct number of `NewsImpact` created per article × classifications, error isolation per article, empty feed handling

---

## Tasks / Subtasks

- [x] Task 1: Define `NewsClassification` type and `NewsClassifierPort` interface (AC: #1)
  - [x] File: `src/lib/server/contexts/news/application/ports/news-classifier.port.ts` (EXISTS AS EMPTY STUB — fill it)
  - [x] Define `NewsClassification` interface: `{ sector: Sector; impactScore: number; impactType: ImpactType }`
  - [x] Define `NewsClassifierPort` interface: `{ classify(headline: string): Promise<NewsClassification[]> }`
  - [x] Import `Sector` from `../../domain/sector` and `ImpactType` from `../../domain/impact-type`
  - [x] No external imports — application layer only

- [x] Task 2: Implement `FakeNewsClassifier` (AC: #4)
  - [x] File: `src/lib/server/contexts/news/infrastructure/fakes/fake-news-classifier.ts` (CREATE NEW — directory exists)
  - [x] Class `FakeNewsClassifier` implementing `NewsClassifierPort`
  - [x] `public classifications: NewsClassification[]` — configurable per-call return value
  - [x] `public shouldThrow = false` — simulate Anthropic API failure
  - [x] `classify()` returns `[...this.classifications]` (copy), throws if `shouldThrow = true`
  - [x] No HTTP call — pure in-memory

- [x] Task 3: Implement `IngestNewsUseCase` (AC: #1, #2, #3)
  - [x] File: `src/lib/server/contexts/news/application/use-cases/ingest-news.use-case.ts` (EXISTS AS EMPTY STUB — fill it)
  - [x] Constructor: `(fetcher: RssFetcherPort, classifier: NewsClassifierPort, repository: NewsImpactRepositoryPort, feedUrls: string[])`
  - [x] `execute()`: iterate `feedUrls`, catch per-feed errors (log + continue)
  - [x] For each article from a feed: call `classify(headline)`, catch per-article errors (log + continue)
  - [x] For each classification result: create `News` + `NewsImpact` with `crypto.randomUUID()` IDs
  - [x] `analyzedAt = new Date()` at classify time; `publishedAt` from `RawArticle.publishedAt`
  - [x] Call `repository.save(news, impacts)` once per article (news + all its impacts atomically)
  - [x] Return `{ articlesIngested: number; impactsStored: number }` summary
  - [x] Log `[PIPELINE] ingest: X articles fetched, Y impacts stored` on completion

- [x] Task 4: Write unit tests for `IngestNewsUseCase` (AC: #4)
  - [x] File: `src/lib/server/contexts/news/application/use-cases/ingest-news.use-case.test.ts` (CREATE NEW)
  - [x] Tests: see Dev Notes for exact test cases

---

## Dev Notes

### File Locations — What Exists vs What to Create

```
src/lib/server/contexts/news/
├── domain/
│   ├── news.ts                          ← DONE (Story 1.2) — do not touch
│   ├── news-impact.ts                   ← DONE (Story 1.2) — do not touch
│   ├── sector.ts                        ← DONE (Story 1.2) — do not touch
│   └── impact-type.ts                   ← DONE (Story 1.2) — do not touch
├── application/
│   ├── ports/
│   │   ├── news-impact.repository.port.ts  ← DONE (Story 1.3) — do not touch
│   │   ├── rss-fetcher.port.ts             ← DONE (Story 2.1) — do not touch
│   │   └── news-classifier.port.ts         ← EMPTY STUB — fill in (Task 1)
│   └── use-cases/
│       ├── ingest-news.use-case.ts         ← EMPTY STUB — fill in (Task 3)
│       └── ingest-news.use-case.test.ts    ← CREATE NEW (Task 4)
└── infrastructure/
    ├── db/
    │   └── news-impact.repository.ts       ← DONE — do not touch
    ├── llm/
    │   └── anthropic-classifier.ts         ← EMPTY STUB — leave for Story 2.2
    ├── rss/
    │   └── rss-fetcher.ts                  ← DONE (Story 2.1) — do not touch
    └── fakes/
        ├── fake-news-impact.repository.ts  ← DONE (Story 1.3) — do not touch
        ├── fake-rss-fetcher.ts             ← DONE (Story 2.1) — do not touch
        └── fake-news-classifier.ts         ← CREATE NEW (Task 2)
```

**Do NOT touch:** `anthropic-classifier.ts` — empty stub for Story 2.2.

### Port Definition — Exact Pattern

```typescript
// src/lib/server/contexts/news/application/ports/news-classifier.port.ts
import type { Sector } from '../../domain/sector';
import type { ImpactType } from '../../domain/impact-type';

export interface NewsClassification {
  sector: Sector;
  impactScore: number; // range [-1, 1]
  impactType: ImpactType;
}

export interface NewsClassifierPort {
  classify(headline: string): Promise<NewsClassification[]>;
}
```

**Why array return?** One article can impact multiple sectors (e.g. an AI regulation article → TECHNOLOGY + COMMUNICATION). The port must support N classifications per article.

### Existing Types — Reference (Do Not Re-declare)

```typescript
// Sector (sector.ts) — const object pattern
export const Sector = {
  TECHNOLOGY: 'TECHNOLOGY', ENERGY: 'ENERGY', HEALTHCARE: 'HEALTHCARE',
  FINANCIALS: 'FINANCIALS', CONSUMER: 'CONSUMER', INDUSTRIALS: 'INDUSTRIALS',
  MATERIALS: 'MATERIALS', UTILITIES: 'UTILITIES', REAL_ESTATE: 'REAL_ESTATE',
  COMMUNICATION: 'COMMUNICATION',
} as const;
export type Sector = (typeof Sector)[keyof typeof Sector];

// ImpactType (impact-type.ts) — const object pattern
export const ImpactType = { STRUCTURAL: 'STRUCTURAL', PUNCTUAL: 'PUNCTUAL' } as const;
export type ImpactType = (typeof ImpactType)[keyof typeof ImpactType];

// News (news.ts)
export interface News { id: string; publishedAt: Date; analyzedAt: Date; source: string; headline: string; }

// NewsImpact (news-impact.ts)
export interface NewsImpact { id: string; newsId: string; sector: Sector; impactScore: number; impactType: ImpactType; }

// RawArticle (rss-fetcher.port.ts)
export interface RawArticle { publishedAt: Date; source: string; headline: string; }

// NewsImpactRepositoryPort (news-impact.repository.port.ts)
export interface NewsImpactRepositoryPort {
  save(news: News, impacts: NewsImpact[]): Promise<void>;
  findAllImpacts(): Promise<NewsImpact[]>;
}
```

### FakeNewsClassifier — Exact Pattern

```typescript
// src/lib/server/contexts/news/infrastructure/fakes/fake-news-classifier.ts
import type { NewsClassifierPort, NewsClassification } from '../../application/ports/news-classifier.port';

export class FakeNewsClassifier implements NewsClassifierPort {
  public classifications: NewsClassification[] = [];
  public shouldThrow = false;

  async classify(_headline: string): Promise<NewsClassification[]> {
    if (this.shouldThrow) {
      throw new Error('Anthropic API error');
    }
    return [...this.classifications];
  }
}
```

**Why same classifications for every call?** Use case tests control the fake's state per test. For tests that need per-article differentiation, override `classifications` between calls via a spy or reset.

### IngestNewsUseCase — Implementation Pattern

```typescript
// src/lib/server/contexts/news/application/use-cases/ingest-news.use-case.ts
import type { RssFetcherPort } from '../ports/rss-fetcher.port';
import type { NewsClassifierPort } from '../ports/news-classifier.port';
import type { NewsImpactRepositoryPort } from '../ports/news-impact.repository.port';
import type { News } from '../../domain/news';
import type { NewsImpact } from '../../domain/news-impact';

export interface IngestNewsResult {
  articlesIngested: number;
  impactsStored: number;
}

export class IngestNewsUseCase {
  constructor(
    private readonly fetcher: RssFetcherPort,
    private readonly classifier: NewsClassifierPort,
    private readonly repository: NewsImpactRepositoryPort,
    private readonly feedUrls: string[],
  ) {}

  async execute(): Promise<IngestNewsResult> {
    let articlesIngested = 0;
    let impactsStored = 0;

    for (const feedUrl of this.feedUrls) {
      let articles;
      try {
        articles = await this.fetcher.fetchArticles(feedUrl);
      } catch (error) {
        console.error(`[PIPELINE] ingest: feed failed ${feedUrl}`, error);
        continue; // skip this feed, process others
      }

      for (const article of articles) {
        try {
          const classifications = await this.classifier.classify(article.headline);

          if (classifications.length === 0) continue;

          const newsId = crypto.randomUUID();
          const news: News = {
            id: newsId,
            publishedAt: article.publishedAt,
            analyzedAt: new Date(),
            source: article.source,
            headline: article.headline,
          };

          const impacts: NewsImpact[] = classifications.map((c) => ({
            id: crypto.randomUUID(),
            newsId,
            sector: c.sector,
            impactScore: c.impactScore,
            impactType: c.impactType,
          }));

          await this.repository.save(news, impacts);
          articlesIngested++;
          impactsStored += impacts.length;
        } catch (error) {
          console.error(`[PIPELINE] ingest: article failed "${article.headline}"`, error);
          // continue to next article — per-article error isolation (NFR6)
        }
      }
    }

    console.log(`[PIPELINE] ingest: ${articlesIngested} articles fetched, ${impactsStored} impacts stored`);
    return { articlesIngested, impactsStored };
  }
}
```

**Critical implementation rules:**
- Feed error (`fetcher.fetchArticles` throws) → `continue` to next feed (NFR7)
- Article error (`classify` throws OR `repository.save` throws) → `console.error` + `continue` to next article (NFR6)
- `save(news, impacts)` is called once per article with ALL its impacts — single atomic transaction per article
- Skip articles with zero classifications (`classifications.length === 0`) — no news row created
- `crypto.randomUUID()` is available natively in Node.js 15+ and Vitest env — no import needed
- `articlesIngested` counts articles that were successfully saved (not just fetched)

### Unit Tests — Exact Test Cases

```typescript
// src/lib/server/contexts/news/application/use-cases/ingest-news.use-case.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { IngestNewsUseCase } from './ingest-news.use-case';
import { FakeRssFetcher } from '../../infrastructure/fakes/fake-rss-fetcher';
import { FakeNewsClassifier } from '../../infrastructure/fakes/fake-news-classifier';
import { FakeNewsImpactRepository } from '../../infrastructure/fakes/fake-news-impact.repository';
import type { RawArticle } from '../ports/rss-fetcher.port';
import type { NewsClassification } from '../ports/news-classifier.port';
import { Sector } from '../../domain/sector';
import { ImpactType } from '../../domain/impact-type';

const makeArticle = (overrides?: Partial<RawArticle>): RawArticle => ({
  headline: 'Test headline',
  publishedAt: new Date('2026-03-19'),
  source: 'Reuters',
  ...overrides,
});

const makeClassification = (overrides?: Partial<NewsClassification>): NewsClassification => ({
  sector: Sector.TECHNOLOGY,
  impactScore: 0.5,
  impactType: ImpactType.PUNCTUAL,
  ...overrides,
});

describe('IngestNewsUseCase', () => {
  let fetcher: FakeRssFetcher;
  let classifier: FakeNewsClassifier;
  let repository: FakeNewsImpactRepository;
  let useCase: IngestNewsUseCase;

  beforeEach(() => {
    fetcher = new FakeRssFetcher();
    classifier = new FakeNewsClassifier();
    repository = new FakeNewsImpactRepository();
    useCase = new IngestNewsUseCase(fetcher, classifier, repository, ['https://feed.com/rss']);
  });

  it('creates one NewsImpact per classification result', async () => {
    fetcher.articles = [makeArticle()];
    classifier.classifications = [makeClassification(), makeClassification({ sector: Sector.ENERGY })];

    const result = await useCase.execute();

    expect(repository.impacts).toHaveLength(2);
    expect(repository.news).toHaveLength(1);
    expect(result.articlesIngested).toBe(1);
    expect(result.impactsStored).toBe(2);
  });

  it('persists same newsId on all impacts for one article', async () => {
    fetcher.articles = [makeArticle()];
    classifier.classifications = [makeClassification(), makeClassification({ sector: Sector.FINANCIALS })];

    await useCase.execute();

    const [n] = repository.news;
    expect(repository.impacts.every((i) => i.newsId === n.id)).toBe(true);
  });

  it('processes multiple articles independently', async () => {
    fetcher.articles = [makeArticle({ headline: 'A' }), makeArticle({ headline: 'B' })];
    classifier.classifications = [makeClassification()];

    await useCase.execute();

    expect(repository.news).toHaveLength(2);
    expect(repository.impacts).toHaveLength(2);
  });

  it('skips article when classifier throws — does not abort pipeline', async () => {
    fetcher.articles = [makeArticle({ headline: 'Bad' }), makeArticle({ headline: 'Good' })];
    let callCount = 0;
    // Override classify to throw on first call only
    classifier.classify = async (headline: string) => {
      callCount++;
      if (callCount === 1) throw new Error('API error');
      return [makeClassification()];
    };

    const result = await useCase.execute();

    expect(repository.news).toHaveLength(1); // only "Good" saved
    expect(result.articlesIngested).toBe(1);
  });

  it('skips feed when fetcher throws — processes other feeds', async () => {
    const goodFetcher = new FakeRssFetcher([makeArticle()]);
    // Two feeds: first throws, second works
    useCase = new IngestNewsUseCase(
      { fetchArticles: async (url: string) => {
        if (url.includes('bad')) throw new Error('unreachable');
        return goodFetcher.fetchArticles(url);
      }},
      classifier,
      repository,
      ['https://bad-feed.com/rss', 'https://good-feed.com/rss'],
    );
    classifier.classifications = [makeClassification()];

    const result = await useCase.execute();

    expect(repository.news).toHaveLength(1);
    expect(result.articlesIngested).toBe(1);
  });

  it('returns zero counts when feed is empty', async () => {
    fetcher.articles = [];
    const result = await useCase.execute();
    expect(result.articlesIngested).toBe(0);
    expect(result.impactsStored).toBe(0);
  });

  it('skips article when classifier returns empty array', async () => {
    fetcher.articles = [makeArticle()];
    classifier.classifications = []; // zero classifications

    const result = await useCase.execute();

    expect(repository.news).toHaveLength(0);
    expect(result.articlesIngested).toBe(0);
  });
});
```

### Import Patterns — Exact Relative Paths

```typescript
// In ingest-news.use-case.ts (application/use-cases/):
import type { RssFetcherPort } from '../ports/rss-fetcher.port';
import type { NewsClassifierPort } from '../ports/news-classifier.port';
import type { NewsImpactRepositoryPort } from '../ports/news-impact.repository.port';
import type { News } from '../../domain/news';
import type { NewsImpact } from '../../domain/news-impact';

// In fake-news-classifier.ts (infrastructure/fakes/):
import type { NewsClassifierPort, NewsClassification } from '../../application/ports/news-classifier.port';

// In ingest-news.use-case.test.ts (application/use-cases/):
import { FakeRssFetcher } from '../../infrastructure/fakes/fake-rss-fetcher';
import { FakeNewsClassifier } from '../../infrastructure/fakes/fake-news-classifier';
import { FakeNewsImpactRepository } from '../../infrastructure/fakes/fake-news-impact.repository';
import type { RawArticle } from '../ports/rss-fetcher.port';
import type { NewsClassification } from '../ports/news-classifier.port';
import { Sector } from '../../domain/sector';
import { ImpactType } from '../../domain/impact-type';
```

**IMPORTANT:** Use case tests are in `application/use-cases/` — paths to `infrastructure/fakes/` go UP two levels first (`../../infrastructure/fakes/`). Do not use `$lib/server/` alias in test files within the same context.

### Architecture Compliance

- ✅ `news-classifier.port.ts` in `application/ports/` — imports domain types only
- ✅ `IngestNewsUseCase` in `application/use-cases/` — imports only own domain + own ports
- ✅ `FakeNewsClassifier` in `infrastructure/fakes/` — no external deps, implements port
- ✅ Use case receives all 3 ports via constructor — no `new DrizzleNewsImpactRepository()` inside use case
- ❌ NEVER import `rss-parser`, `@anthropic-ai/sdk`, or any external lib in `application/` files
- ❌ NEVER import from `contexts/scoring/` — cross-context deps go in `cross-context/pipeline/`
- ❌ NEVER catch errors silently — always `console.error` before skipping
- ❌ NEVER call `validateNewsImpact()` in the use case — trust incoming data from classifier

### Error Isolation Pattern (NFR6 / NFR7)

Two distinct error boundaries:

| Error source | Boundary | Action |
|---|---|---|
| `fetcher.fetchArticles(url)` throws | Per-feed | `console.error` + `continue` (next feed) |
| `classifier.classify(headline)` throws | Per-article | `console.error` + `continue` (next article) |
| `repository.save()` throws | Per-article | `console.error` + `continue` (next article) |

Do NOT catch errors at the `execute()` function level — let the caller (`RunDailyPipelineUseCase` in Story 2.4) decide if a complete failure is fatal.

### Relationship With Other Stories

- **Stories 1.2–1.3 (done):** `News`, `NewsImpact`, domain types, `FakeNewsImpactRepository` — import from there, do not duplicate
- **Story 2.1 (done):** `RssFetcherPort`, `RawArticle`, `FakeRssFetcher` — import from there
- **Story 2.2 (backlog):** `AnthropicClassifier` implements `NewsClassifierPort` — leave `anthropic-classifier.ts` stub untouched
- **Story 2.4 (next):** `RunDailyPipelineUseCase` will instantiate `IngestNewsUseCase` with real adapters and call `execute()`; `IngestNewsResult` return type will be used in the summary JSON

### Patterns From Previous Stories

- Test file co-location: use case tests go in the same folder as the use case (`application/use-cases/`)
- Fakes expose public state for direct test assertion (`repository.news`, `repository.impacts`)
- `beforeEach` resets all fakes — never share state between tests
- `import { describe, it, expect, beforeEach } from 'vitest'` — no setup framework
- No `it.only`, no `describe.skip` in committed tests
- Run unit tests: `npm run test:unit`

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `FakeNewsClassifier` existait déjà avec `ApiError` (convention projet). Story spec disait `new Error(...)` mais le projet utilise `ApiError` comme wrapper standard dans `src/lib/server/`. L'implémentation suit la convention projet.

### Completion Notes List

- Task 1: `news-classifier.port.ts` était déjà complet (stub pré-rempli lors du scaffold)
- Task 2: `FakeNewsClassifier` aligné sur la convention `ApiError` du projet (non `Error` simple comme indiqué dans la story spec)
- Task 3: `IngestNewsUseCase` implémenté avec double isolation d'erreur (per-feed + per-article)
- Task 4: 7 tests unitaires couvrent tous les ACs — 53 tests passent, 0 régression

### File List

- `src/lib/server/contexts/news/application/ports/news-classifier.port.ts` (vérifié — déjà complet)
- `src/lib/server/contexts/news/infrastructure/fakes/fake-news-classifier.ts` (modifié — aligné convention projet)
- `src/lib/server/contexts/news/application/use-cases/ingest-news.use-case.ts` (créé)
- `src/lib/server/contexts/news/application/use-cases/ingest-news.use-case.test.ts` (créé)

## Change Log

- 2026-03-19: Story created by create-story workflow
- 2026-03-19: Story implemented by dev agent — IngestNewsUseCase + FakeNewsClassifier + 7 unit tests (53 tests pass)
