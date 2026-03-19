# Story 2.2: Anthropic Classifier — Port & Adapter

**Status:** ready-for-dev
**Epic:** 2 — Autonomous Daily Ingestion Pipeline
**Story ID:** 2-2

---

## Story

As a developer,
I want a `NewsClassifierPort` with an Anthropic adapter and a fake,
So that the ingestion use case can classify articles without depending on the Anthropic SDK directly, and tests can run without API calls.

---

## Acceptance Criteria

1. **Given** `news-classifier.port.ts` defines the port
   **When** imported from `contexts/news/application/`
   **Then** it exposes `classify(headline: string): Promise<NewsClassification[]>` where `NewsClassification` = `{ sector: Sector, impactScore: number, impactType: ImpactType }`
   **And** the return type is an array — one article can produce multiple classifications

2. **Given** `AnthropicClassifier` implements the port in `infrastructure/llm/`
   **When** called with a headline
   **Then** it sends a prompt to `claude-sonnet` requesting a JSON array of `{ sector, impactScore, impactType }`
   **And** each `impactScore` in the response is within [-1, 1]
   **And** each `sector` is a valid `Sector` enum value

3. **Given** the Anthropic API returns an error
   **When** `classify()` is called
   **Then** it throws a catchable `ApiError` — it does not crash the process

4. **Given** `FakeNewsClassifier` exists in `infrastructure/fakes/`
   **When** used in unit tests
   **Then** it returns a configurable `NewsClassification[]` without any HTTP call

---

## Tasks / Subtasks

- [ ] Task 1: Define `NewsClassification` type and `NewsClassifierPort` interface (AC: #1)
  - [ ] File: `src/lib/server/contexts/news/application/ports/news-classifier.port.ts` (REPLACE EMPTY STUB — file exists but is empty)
  - [ ] Import `Sector` from `../../domain/sector` and `ImpactType` from `../../domain/impact-type`
  - [ ] Define `NewsClassification` interface: `{ sector: Sector; impactScore: number; impactType: ImpactType }`
  - [ ] Define `NewsClassifierPort` interface: `{ classify(headline: string): Promise<NewsClassification[]> }`
  - [ ] No imports outside own `domain/` folder — `Sector` and `ImpactType` are domain types, allowed

- [ ] Task 2: Install Anthropic SDK and implement `AnthropicClassifier` (AC: #2, #3)
  - [ ] Install `@anthropic-ai/sdk` (npm) — see Dev Notes for exact command
  - [ ] File: `src/lib/server/contexts/news/infrastructure/llm/anthropic-classifier.ts` (REPLACE EMPTY STUB — file exists but is empty)
  - [ ] Class `AnthropicClassifier` implementing `NewsClassifierPort`
  - [ ] Inject `apiKey: string` via constructor — never hardcode the key
  - [ ] Use `claude-sonnet-4-6` model (current production model, see Dev Notes)
  - [ ] Send prompt requesting JSON array; parse and validate response
  - [ ] Validate: `impactScore` clamped to [-1, 1], `sector` must be valid `Sector` value
  - [ ] On API error: wrap with `createApiError()` and throw — never swallow silently
  - [ ] See Dev Notes for exact prompt structure, SDK usage pattern, and response parsing

- [ ] Task 3: Implement `FakeNewsClassifier` (AC: #4)
  - [ ] File: `src/lib/server/contexts/news/infrastructure/fakes/fake-news-classifier.ts` (CREATE NEW — directory already exists)
  - [ ] Class `FakeNewsClassifier` implementing `NewsClassifierPort`
  - [ ] Constructor takes optional `classifications: NewsClassification[]` — defaults to `[]`
  - [ ] Expose `public classifications: NewsClassification[]` for test assertions
  - [ ] `classify()` returns `[...this.classifications]` — no HTTP call
  - [ ] Support configuring a `shouldThrow` flag to simulate API failure in tests (throws `ApiError`)
  - [ ] Mirror the `FakeRssFetcher` pattern exactly (see Dev Notes)

- [ ] Task 4: Write unit tests for `FakeNewsClassifier` (no DB, no API calls required)
  - [ ] File: `src/lib/server/contexts/news/infrastructure/fakes/fake-news-classifier.test.ts` (CREATE NEW)
  - [ ] Tests: returns configured classifications, returns empty array by default, throws when `shouldThrow = true`, returns a copy (mutation test), ignores headline argument

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
│   │   ├── rss-fetcher.port.ts             ← DONE (Story 2.1) — do not touch
│   │   └── news-classifier.port.ts         ← REPLACE EMPTY STUB (this story)
│   └── use-cases/
│       └── ingest-news.use-case.ts         ← EMPTY STUB — leave for Story 2.3
└── infrastructure/
    ├── db/
    │   ├── news-impact.schema.ts           ← DONE (Story 1.3) — do not touch
    │   └── news-impact.repository.ts       ← DONE (Story 1.3) — do not touch
    ├── llm/
    │   └── anthropic-classifier.ts         ← REPLACE EMPTY STUB (this story)
    ├── rss/
    │   └── rss-fetcher.ts                  ← DONE (Story 2.1) — do not touch
    └── fakes/
        ├── fake-news-impact.repository.ts  ← DONE (Story 1.3) — do not touch
        ├── fake-rss-fetcher.ts             ← DONE (Story 2.1) — do not touch
        └── fake-news-classifier.ts         ← CREATE NEW (this story)
```

**Do NOT touch:** `ingest-news.use-case.ts` — empty stub for Story 2.3.

### Anthropic SDK — Installation & Usage

**Install command:**
```bash
npm install @anthropic-ai/sdk
```

**SDK version:** Use latest stable `@anthropic-ai/sdk`. Current production model ID: `claude-sonnet-4-6`.

**Basic usage pattern:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey });
const message = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  messages: [{ role: 'user', content: prompt }],
});
// message.content[0] is a TextBlock: { type: 'text', text: string }
const text = (message.content[0] as { type: 'text'; text: string }).text;
```

**Instantiation:** Inject `apiKey: string` via constructor. Do NOT call `new Anthropic()` at module level — the key must come from the caller at wiring time, not from `process.env` inside the adapter.

### Port Definition — Exact Pattern

```typescript
// src/lib/server/contexts/news/application/ports/news-classifier.port.ts
import type { Sector } from '../../domain/sector';
import type { ImpactType } from '../../domain/impact-type';

export interface NewsClassification {
  sector: Sector;
  impactScore: number;
  impactType: ImpactType;
}

export interface NewsClassifierPort {
  classify(headline: string): Promise<NewsClassification[]>;
}
```

**Why `NewsClassification` lives in the port file?** Same reasoning as `RawArticle` in the RSS port — it is the data contract between application and infrastructure, adapter-agnostic.

### Prompt Engineering — Exact Structure

```typescript
const prompt = `You are a financial news classifier. Analyze the following news headline and return a JSON array of sector impacts.

Headline: "${headline}"

Rules:
- Each entry in the array must have: sector (one of: ${Object.values(Sector).join(', ')}), impactScore (number between -1 and 1, where -1 = very negative, 0 = neutral, 1 = very positive), impactType (STRUCTURAL or PUNCTUAL)
- STRUCTURAL: fundamental, long-lasting change (months/years) — e.g. regulatory change, new technology, structural market shift
- PUNCTUAL: temporary, short-lived event (days/weeks) — e.g. earnings miss, one-off incident, temporary supply disruption
- Include ALL sectors meaningfully impacted (can be multiple)
- Omit sectors with no meaningful impact
- Return only valid JSON, no explanation text

Example output:
[{"sector":"TECHNOLOGY","impactScore":0.8,"impactType":"STRUCTURAL"},{"sector":"FINANCIALS","impactScore":-0.3,"impactType":"PUNCTUAL"}]`;
```

### AnthropicClassifier — Complete Implementation Pattern

```typescript
// src/lib/server/contexts/news/infrastructure/llm/anthropic-classifier.ts
import Anthropic from '@anthropic-ai/sdk';
import { createApiError } from '../../../shared/errors/api-error'; // adjust path if needed
import { Sector } from '../../domain/sector';
import { ImpactType } from '../../domain/impact-type';
import type { NewsClassifierPort, NewsClassification } from '../../application/ports/news-classifier.port';

export class AnthropicClassifier implements NewsClassifierPort {
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async classify(headline: string): Promise<NewsClassification[]> {
    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: buildPrompt(headline) }],
      });

      const text = (message.content[0] as { type: 'text'; text: string }).text;
      const raw: unknown = JSON.parse(text);

      if (!Array.isArray(raw)) {
        throw new Error('Classifier response is not an array');
      }

      return raw
        .filter(isRawClassification)
        .map(({ sector, impactScore, impactType }) => ({
          sector,
          impactScore: Math.max(-1, Math.min(1, impactScore)),
          impactType,
        }));
    } catch (error) {
      throw createApiError(error);
    }
  }
}

function buildPrompt(headline: string): string {
  return `You are a financial news classifier. Analyze the following news headline and return a JSON array of sector impacts.

Headline: "${headline}"

Rules:
- Each entry must have: sector (one of: ${Object.values(Sector).join(', ')}), impactScore (number between -1 and 1), impactType (STRUCTURAL or PUNCTUAL)
- STRUCTURAL: fundamental, long-lasting change (months/years)
- PUNCTUAL: temporary, short-lived event (days/weeks)
- Include ALL sectors meaningfully impacted
- Return only valid JSON array, no explanation

Example: [{"sector":"TECHNOLOGY","impactScore":0.8,"impactType":"STRUCTURAL"}]`;
}

interface RawClassification {
  sector: Sector;
  impactScore: number;
  impactType: ImpactType;
}

function isRawClassification(item: unknown): item is RawClassification {
  if (typeof item !== 'object' || item === null) return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.sector === 'string' &&
    Object.values(Sector).includes(obj.sector as Sector) &&
    typeof obj.impactScore === 'number' &&
    typeof obj.impactType === 'string' &&
    Object.values(ImpactType).includes(obj.impactType as ImpactType)
  );
}
```

**Key implementation rules:**
- Instantiate `Anthropic` client in constructor with injected `apiKey` — never `process.env.ANTHROPIC_API_KEY` inside the adapter
- Clamp `impactScore` to [-1, 1] — LLM can hallucinate values outside range
- Filter with `isRawClassification` — skip malformed entries silently, throw only on total failure
- Wrap ALL errors (network, parse, validation) with `createApiError()` before throwing
- `buildPrompt` extracted as module-level function for testability

### ApiError Path — Check Existing Implementation

Before implementing: verify the exact import path for `createApiError` by checking:
```
src/lib/server/shared/infrastructure/errors/api-error.ts
# OR
src/lib/server/infrastructure/errors/api-error.ts
```

The architecture doc references `src/lib/server/infrastructure/errors/api-error.ts`. Confirm this file exists and use its actual path in the import.

### Fake Implementation — Exact Pattern (mirrors FakeRssFetcher)

```typescript
// src/lib/server/contexts/news/infrastructure/fakes/fake-news-classifier.ts
import type { NewsClassifierPort, NewsClassification } from '../../application/ports/news-classifier.port';
import { ApiError } from '../../../shared/errors/api-error'; // adjust path

export class FakeNewsClassifier implements NewsClassifierPort {
  public classifications: NewsClassification[];
  public shouldThrow = false;

  constructor(classifications: NewsClassification[] = []) {
    this.classifications = classifications;
  }

  async classify(_headline: string): Promise<NewsClassification[]> {
    if (this.shouldThrow) {
      throw new ApiError(500, 'Anthropic API unavailable');
    }
    return [...this.classifications];
  }
}
```

**Why `public classifications` and `public shouldThrow`?** Tests set and assert on these directly:
```typescript
const fake = new FakeNewsClassifier();
fake.classifications = [{ sector: 'TECHNOLOGY', impactScore: 0.7, impactType: 'STRUCTURAL' }];
fake.shouldThrow = true; // simulate Anthropic API failure
```

### Unit Test Pattern

```typescript
// src/lib/server/contexts/news/infrastructure/fakes/fake-news-classifier.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { FakeNewsClassifier } from './fake-news-classifier';
import type { NewsClassification } from '../../application/ports/news-classifier.port';

const makeClassification = (overrides?: Partial<NewsClassification>): NewsClassification => ({
  sector: 'TECHNOLOGY',
  impactScore: 0.5,
  impactType: 'STRUCTURAL',
  ...overrides,
});

describe('FakeNewsClassifier', () => {
  let fake: FakeNewsClassifier;

  beforeEach(() => {
    fake = new FakeNewsClassifier();
  });

  it('returns empty array by default', async () => {
    const result = await fake.classify('Any headline');
    expect(result).toHaveLength(0);
  });

  it('returns configured classifications', async () => {
    fake.classifications = [makeClassification(), makeClassification({ sector: 'ENERGY' })];
    const result = await fake.classify('Any headline');
    expect(result).toHaveLength(2);
    expect(result[0].sector).toBe('TECHNOLOGY');
  });

  it('returns a copy — mutating result does not affect internal state', async () => {
    fake.classifications = [makeClassification()];
    const result = await fake.classify('Any headline');
    result.pop();
    expect(fake.classifications).toHaveLength(1);
  });

  it('throws ApiError when shouldThrow is true', async () => {
    fake.shouldThrow = true;
    await expect(fake.classify('Any headline')).rejects.toThrow();
  });

  it('ignores the headline argument (any headline returns same classifications)', async () => {
    fake.classifications = [makeClassification()];
    const r1 = await fake.classify('Headline A');
    const r2 = await fake.classify('Headline B');
    expect(r1).toHaveLength(1);
    expect(r2).toHaveLength(1);
  });
});
```

### Architecture Compliance

- ✅ `news-classifier.port.ts` in `application/ports/` — imports only own domain types (`Sector`, `ImpactType`)
- ✅ `AnthropicClassifier` in `infrastructure/llm/` — implements port, imports `@anthropic-ai/sdk` (external OK in infrastructure)
- ✅ `FakeNewsClassifier` in `infrastructure/fakes/` — implements port, no external deps
- ❌ NEVER import `@anthropic-ai/sdk` in `application/` or `domain/` files
- ❌ NEVER import `AnthropicClassifier` (concrete) from `application/` — only `NewsClassifierPort` interface
- ❌ NEVER read `process.env.ANTHROPIC_API_KEY` inside the adapter — key must be injected via constructor
- ❌ NEVER put `ANTHROPIC_API_KEY` reading logic inside infrastructure — wiring happens in `+server.ts` or cron handler

### Import Patterns — Consistent With Codebase

```typescript
// Port file — imports from own domain (relative path):
import type { Sector } from '../../domain/sector';
import type { ImpactType } from '../../domain/impact-type';

// Adapter — imports from own port (relative path):
import type { NewsClassifierPort, NewsClassification } from '../../application/ports/news-classifier.port';

// Fake — imports from port (same as adapter):
import type { NewsClassifierPort, NewsClassification } from '../../application/ports/news-classifier.port';

// Tests — import from sibling file (relative):
import { FakeNewsClassifier } from './fake-news-classifier';
```

Use `import type` for interfaces (TypeScript-only, no runtime cost). Use regular `import` for classes and values (Sector, ImpactType const objects).

### Error Handling Contract

Per architecture (NFR6), error isolation for Anthropic failures happens in the **use case** (Story 2.3), not the adapter:
- `AnthropicClassifier.classify()` → throws `ApiError` on API failure, network error, or parse failure
- Story 2.3 (`IngestNewsUseCase`) wraps each `classify()` call in `try/catch`, logs with `console.error`, and continues with other articles
- Do NOT silently swallow errors in `AnthropicClassifier` — callers must see them
- Wrap with `createApiError()` before throwing so the caller always receives a typed `ApiError`

### Relationship With Other Stories

- **Story 2.1 (previous):** Established `RssFetcherPort` + `FakeRssFetcher` — this story mirrors the exact same port/adapter/fake pattern
- **Story 2.3 (next):** `IngestNewsUseCase` will inject `NewsClassifierPort` via constructor — `FakeNewsClassifier` will be used in its unit tests
- **Story 2.4:** Wiring layer (`cron-handler.ts`, `+server.ts`) will instantiate `AnthropicClassifier(process.env.ANTHROPIC_API_KEY!)` — that is where the env var is read

### Patterns From Previous Stories — Do Not Deviate

- Tests use `import { describe, it, expect, beforeEach } from 'vitest'` — no test runner setup needed
- Fakes expose `public` state for direct test assertions (see `FakeRssFetcher`, `FakeNewsImpactRepository`)
- Unit tests for fakes co-located in `infrastructure/fakes/`
- Fake constructors accept optional initial data
- Run unit tests: `npm run test:unit` — vitest picks up all `*.test.ts` files automatically
- No `it.only`, no `describe.skip` in committed tests
- Verify test suite still passes after implementation: `npm run test:unit`

---

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

_none_

### Completion Notes List

_to be filled by dev agent_

### File List

- `src/lib/server/contexts/news/application/ports/news-classifier.port.ts` (replace empty stub)
- `src/lib/server/contexts/news/infrastructure/llm/anthropic-classifier.ts` (replace empty stub)
- `src/lib/server/contexts/news/infrastructure/fakes/fake-news-classifier.ts` (create new)
- `src/lib/server/contexts/news/infrastructure/fakes/fake-news-classifier.test.ts` (create new)
- `package.json` (updated — add `@anthropic-ai/sdk`)
- `package-lock.json` (updated)

## Change Log

- 2026-03-19: Story created by create-story workflow
