# Story 2.1: RSS Fetcher — Port & Adapter

**Status:** review
**Epic:** 2 — Autonomous Daily Ingestion Pipeline
**Story ID:** 2-1

---

## Story

As a developer,
I want an `RssFetcherPort` with a real RSS adapter and a fake,
So that the ingestion use case can fetch articles without depending on a specific HTTP library, and tests can run offline.

---

## Acceptance Criteria

1. **Given** `rss-fetcher.port.ts` defines the port
   **When** imported from `contexts/news/application/`
   **Then** it exposes `fetchArticles(feedUrl: string): Promise<RawArticle[]>` where `RawArticle` contains at minimum `publishedAt`, `source`, `headline`

2. **Given** `RssFetcher` implements the port in `infrastructure/rss/`
   **When** called with a valid RSS feed URL
   **Then** it returns parsed articles with `publishedAt`, `source`, and `headline` populated
   **And** if the feed is unavailable, it throws a catchable error (does not crash the process)

3. **Given** `FakeRssFetcher` exists in `infrastructure/fakes/`
   **When** used in unit tests
   **Then** it returns a configurable list of `RawArticle` without any HTTP call

---

## Tasks / Subtasks

- [x] Task 1: Define `RawArticle` type and `RssFetcherPort` interface (AC: #1)
    - [x] File: `src/lib/server/contexts/news/application/ports/rss-fetcher.port.ts` (CREATE NEW)
    - [x] Define `RawArticle` interface: `{ publishedAt: Date; source: string; headline: string }`
    - [x] Define `RssFetcherPort` interface: `{ fetchArticles(feedUrl: string): Promise<RawArticle[]> }`
    - [x] Zero imports outside `application/` layer (no Drizzle, no SDK)

- [x] Task 2: Install RSS parsing library and implement `RssFetcher` (AC: #2)
    - [x] Install `rss-parser` (npm) — see Dev Notes for exact command and version
    - [x] File: `src/lib/server/contexts/news/infrastructure/rss/rss-fetcher.ts` (CREATE NEW — directory does not exist yet)
    - [x] Class `RssFetcher` implementing `RssFetcherPort`
    - [x] Parse `feed.items` → map to `RawArticle[]`: extract `title` → `headline`, `isoDate`/`pubDate` → `publishedAt` (as `Date`), `feed.title` or feed domain → `source`
    - [x] On fetch/parse failure: throw a catchable `Error` (not `ApiError` — this is infrastructure-level)
    - [x] Do NOT catch errors internally — let the use case handle them (NFR6/NFR7 pattern)

- [x] Task 3: Implement `FakeRssFetcher` (AC: #3)
    - [x] File: `src/lib/server/contexts/news/infrastructure/fakes/fake-rss-fetcher.ts` (CREATE NEW — directory already exists)
    - [x] Class `FakeRssFetcher` implementing `RssFetcherPort`
    - [x] Constructor takes optional `articles: RawArticle[]` — defaults to `[]`
    - [x] Expose public `articles: RawArticle[]` for test assertions
    - [x] `fetchArticles()` returns `[...this.articles]` — no HTTP call
    - [x] Support configuring a `shouldThrow` flag to simulate feed failure in tests

- [x] Task 4: Write unit tests for `FakeRssFetcher` (no DB required)
    - [x] File: `src/lib/server/contexts/news/infrastructure/fakes/fake-rss-fetcher.test.ts` (CREATE NEW)
    - [x] Tests: returns configured articles, returns empty array by default, throws when `shouldThrow = true`

---

## Dev Notes

### File Locations — What Exists vs What to Create

```
src/lib/server/contexts/news/
├── domain/
│   ├── news.ts                          ← DONE (Story 1.2) — do not touch
│   ├── news-impact.ts                   ← DONE (Story 1.2) — do not touch
│   ├── sector.ts                        ← DONE (Story 1.2) — do not touch
│   ├── impact-type.ts                   ← DONE (Story 1.2) — do not touch
│   └── news-impact.test.ts              ← DONE — do not touch
├── application/
│   ├── ports/
│   │   ├── news-impact.repository.port.ts  ← DONE (Story 1.3) — do not touch
│   │   ├── news-classifier.port.ts         ← EMPTY STUB — leave for Story 2.2
│   │   └── rss-fetcher.port.ts             ← CREATE NEW (this story)
│   └── use-cases/
│       └── ingest-news.use-case.ts         ← EMPTY STUB — leave for Story 2.3
└── infrastructure/
    ├── db/
    │   ├── news-impact.schema.ts           ← DONE (Story 1.3) — do not touch
    │   └── news-impact.repository.ts       ← DONE (Story 1.3) — do not touch
    ├── llm/
    │   └── anthropic-classifier.ts         ← EMPTY STUB — leave for Story 2.2
    ├── rss/
    │   └── rss-fetcher.ts                  ← CREATE NEW directory + file
    └── fakes/
        ├── fake-news-impact.repository.ts  ← DONE (Story 1.3) — do not touch
        └── fake-rss-fetcher.ts             ← CREATE NEW (directory exists)
```

**Do NOT touch:** `news-classifier.port.ts`, `ingest-news.use-case.ts`, `anthropic-classifier.ts` — those are empty stubs for Stories 2.2 and 2.3.

### RSS Library — `rss-parser`

**Install command:**

```bash
npm install rss-parser
```

**Why `rss-parser`?** It is the most-used Node.js RSS/Atom feed parsing library (400k+ weekly downloads), has TypeScript types bundled (`@types/rss-parser` not needed), handles both RSS 2.0 and Atom feeds, and works in Node.js (server-side only — not browser). It fetches and parses in one call.

**Basic usage pattern:**

```typescript
import Parser from 'rss-parser';

const parser = new Parser();
const feed = await parser.parseURL(feedUrl);
// feed.title       → feed source name (e.g. "Reuters Business News")
// feed.items[]     → array of articles
// item.title       → headline
// item.isoDate     → ISO date string (preferred) or item.pubDate (fallback)
// item.link        → article URL (available if needed later)
```

**Type declaration — what to import:**

```typescript
import Parser from 'rss-parser';
// The Parser class is the default export
```

**Date parsing:**

```typescript
// Always prefer isoDate, fall back to pubDate
const publishedAt = new Date(item.isoDate ?? item.pubDate ?? new Date().toISOString());
```

**Source extraction:**

```typescript
// Use feed title as source — most reliable
const source = feed.title ?? new URL(feedUrl).hostname;
```

### Port Definition — Exact Pattern

```typescript
// src/lib/server/contexts/news/application/ports/rss-fetcher.port.ts

export interface RawArticle {
    publishedAt: Date;
    source: string;
    headline: string;
}

export interface RssFetcherPort {
    fetchArticles(feedUrl: string): Promise<RawArticle[]>;
}
```

**Why `RawArticle` lives in the port file?** It is the data contract between the application layer and infrastructure. It belongs to `application/ports/` — not to `domain/` (no business rules) and not to `infrastructure/` (adapter-agnostic).

### Real Adapter — `RssFetcher` Pattern

```typescript
// src/lib/server/contexts/news/infrastructure/rss/rss-fetcher.ts
import Parser from 'rss-parser';
import type { RssFetcherPort, RawArticle } from '../../application/ports/rss-fetcher.port';

const parser = new Parser();

export class RssFetcher implements RssFetcherPort {
    async fetchArticles(feedUrl: string): Promise<RawArticle[]> {
        const feed = await parser.parseURL(feedUrl);
        const source = feed.title ?? new URL(feedUrl).hostname;

        return (feed.items ?? [])
            .filter((item) => !!item.title)
            .map((item) => ({
                headline: item.title!,
                publishedAt: new Date(item.isoDate ?? item.pubDate ?? new Date().toISOString()),
                source
            }));
    }
}
```

**Key implementation rules:**

- Instantiate `Parser` at module level (singleton) — avoids re-creating on every call
- Filter items without `title` — headline is required (`RawArticle.headline` is non-nullable)
- Let `parseURL` throw naturally — the caller (`IngestNewsUseCase` in Story 2.3) catches per-feed errors
- Do NOT wrap errors with `createApiError()` here — that's a route-handler concern, not adapter concern

### Fake Implementation — Configurable Pattern

```typescript
// src/lib/server/contexts/news/infrastructure/fakes/fake-rss-fetcher.ts
import type { RssFetcherPort, RawArticle } from '../../application/ports/rss-fetcher.port';

export class FakeRssFetcher implements RssFetcherPort {
    public articles: RawArticle[];
    public shouldThrow = false;

    constructor(articles: RawArticle[] = []) {
        this.articles = articles;
    }

    async fetchArticles(_feedUrl: string): Promise<RawArticle[]> {
        if (this.shouldThrow) {
            throw new Error('Feed unavailable');
        }
        return [...this.articles];
    }
}
```

**Why `public articles` and `public shouldThrow`?** Tests set and assert on these directly:

```typescript
const fake = new FakeRssFetcher();
fake.articles = [{ headline: 'Big news', publishedAt: new Date(), source: 'Reuters' }];
fake.shouldThrow = true; // simulate unavailable feed
```

### Unit Test Pattern

```typescript
// src/lib/server/contexts/news/infrastructure/fakes/fake-rss-fetcher.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { FakeRssFetcher } from './fake-rss-fetcher';
import type { RawArticle } from '../../application/ports/rss-fetcher.port';

const makeArticle = (overrides?: Partial<RawArticle>): RawArticle => ({
    headline: 'Test headline',
    publishedAt: new Date('2026-03-19'),
    source: 'Reuters',
    ...overrides
});

describe('FakeRssFetcher', () => {
    let fake: FakeRssFetcher;

    beforeEach(() => {
        fake = new FakeRssFetcher();
    });

    it('returns empty array by default', async () => {
        const result = await fake.fetchArticles('https://any-feed.com/rss');
        expect(result).toHaveLength(0);
    });

    it('returns configured articles', async () => {
        fake.articles = [makeArticle(), makeArticle({ headline: 'Other news' })];
        const result = await fake.fetchArticles('https://any-feed.com/rss');
        expect(result).toHaveLength(2);
        expect(result[0].headline).toBe('Test headline');
    });

    it('returns a copy — mutating result does not affect internal state', async () => {
        fake.articles = [makeArticle()];
        const result = await fake.fetchArticles('https://any-feed.com/rss');
        result.pop();
        expect(fake.articles).toHaveLength(1);
    });

    it('throws when shouldThrow is true', async () => {
        fake.shouldThrow = true;
        await expect(fake.fetchArticles('https://any-feed.com/rss')).rejects.toThrow(
            'Feed unavailable'
        );
    });

    it('ignores the feedUrl argument (any URL returns same articles)', async () => {
        fake.articles = [makeArticle()];
        const r1 = await fake.fetchArticles('https://feed-a.com/rss');
        const r2 = await fake.fetchArticles('https://feed-b.com/rss');
        expect(r1).toHaveLength(1);
        expect(r2).toHaveLength(1);
    });
});
```

### Architecture Compliance

- ✅ `rss-fetcher.port.ts` in `application/ports/` — zero external imports
- ✅ `RssFetcher` in `infrastructure/rss/` — implements port, imports `rss-parser` (external OK in infrastructure)
- ✅ `FakeRssFetcher` in `infrastructure/fakes/` — implements port, no external deps
- ❌ NEVER import `rss-parser` in `application/` or `domain/` files
- ❌ NEVER import `RssFetcher` (concrete) from `application/` — only `RssFetcherPort` interface
- ❌ NEVER put feed URL configuration inside the adapter — that belongs to the use case or wiring layer

### Import Patterns — From Existing Codebase

```typescript
// From infrastructure → own application/ports (relative path):
import type { RssFetcherPort, RawArticle } from '../../application/ports/rss-fetcher.port';

// From infrastructure fakes → application/ports (relative path):
import type { RssFetcherPort, RawArticle } from '../../application/ports/rss-fetcher.port';

// In tests — import from sibling file (relative):
import { FakeRssFetcher } from './fake-rss-fetcher';
```

No `$lib/server/` alias needed for these files — all paths are relative within the `contexts/news/` subtree.

### Error Handling Contract

Per architecture (NFR6 / NFR7), error isolation happens in the **use case**, not the adapter:

- `RssFetcher.fetchArticles()` → throws `Error` on feed unavailability (network error, parse error)
- Story 2.3 (`IngestNewsUseCase`) will wrap each feed fetch in a `try/catch`, log the error, and continue with other feeds
- Do NOT use `try/catch` in `RssFetcher` to swallow errors — callers must see them

### Relationship With Other Stories

- **Stories 1.2–1.5 (previous):** Provided `News`, `NewsImpact`, `Sector`, `ImpactType`, and all DB infrastructure — do not reimport or duplicate
- **Story 2.2 (next):** `NewsClassifierPort` + `AnthropicClassifier` — same port/adapter/fake pattern as this story
- **Story 2.3 (after 2.2):** `IngestNewsUseCase` will inject `RssFetcherPort` via constructor — `FakeRssFetcher` will be used in its unit tests
- **Story 2.4:** `RunDailyPipelineUseCase` wiring — feed URLs will be injected at this layer from `env` variables

### Patterns From Previous Stories (1.3, 1.5)

- Tests use `import { describe, it, expect, beforeEach } from 'vitest'` — no test runner setup
- Fakes expose public state for direct test assertions
- Unit tests for fakes co-located in `infrastructure/fakes/`
- Fake constructors accept optional initial data (see `FakeNewsImpactRepository` pattern)
- Run unit tests: `npm run test:unit` — vitest picks up all `*.test.ts` files
- No `it.only`, no `describe.skip` in committed tests

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_none_

### Completion Notes List

- Task 1: `RawArticle` interface et `RssFetcherPort` créés dans `application/ports/rss-fetcher.port.ts` — zéro imports externes, contrat de données adapter-agnostique.
- Task 2: `rss-parser@3.13.0` installé. `RssFetcher` créé dans `infrastructure/rss/rss-fetcher.ts` — parser instancié au niveau module (singleton), filtre les items sans titre, laisse les erreurs remonter naturellement (pattern NFR6/NFR7).
- Task 3: `FakeRssFetcher` créé dans `infrastructure/fakes/fake-rss-fetcher.ts` — `public articles` et `public shouldThrow` pour assertions directes dans les tests, retourne une copie via spread.
- Task 4: 5 tests unitaires écrits et passants pour `FakeRssFetcher`. Suite complète: 41 passed, 0 failures, 0 regressions.

### File List

- `src/lib/server/contexts/news/application/ports/rss-fetcher.port.ts` (créé)
- `src/lib/server/contexts/news/infrastructure/rss/rss-fetcher.ts` (créé — nouveau répertoire `rss/`)
- `src/lib/server/contexts/news/infrastructure/fakes/fake-rss-fetcher.ts` (créé)
- `src/lib/server/contexts/news/infrastructure/fakes/fake-rss-fetcher.test.ts` (créé)
- `package.json` (mis à jour — ajout `rss-parser@3.13.0`)
- `package-lock.json` (mis à jour)

## Change Log

- 2026-03-19: Story created by create-story workflow
- 2026-03-19: Story implemented by dev agent — all tasks complete, 41 unit tests passing
