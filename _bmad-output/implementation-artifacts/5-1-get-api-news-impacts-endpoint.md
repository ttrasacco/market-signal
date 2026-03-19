# Story 5.1: GET /api/news-impacts — ops/debug endpoint

Status: review

## Story

As a developer,
I want a `GET /api/news-impacts` route that exposes raw classified events,
so that I can inspect classification results directly from a browser or curl without needing psql access.

## Acceptance Criteria

1. **Given** `GET /api/news-impacts` receives a request
   **When** the route handler calls the repository
   **Then** it returns HTTP 200 with `{ impacts: NewsImpact[] }` — all records from the event store
   **And** the response is read-only — no mutation possible via this endpoint

2. **Given** the endpoint is called 61 times in one minute from the same IP
   **When** the 61st request arrives
   **Then** `hooks.server.ts` returns HTTP 429 (rate limiter already handles this automatically)

3. **Given** an optional `?sector=TECHNOLOGY` query param is provided
   **When** the handler filters
   **Then** only impacts for that sector are returned

## Tasks / Subtasks

- [x] Task 1 — Create the route file at the correct path (AC: #1, #2, #3)
    - [x] Create `src/routes/api/news-impacts/+server.ts`
    - [x] Wire `DrizzleNewsImpactAdapter` (existing class)
    - [x] Call `findAllImpacts()` and return `{ impacts }` JSON
    - [x] Read optional `?sector=` query param; if present, filter the result array in-handler
    - [x] Wrap in `try/catch` — return `{ error, code }` on failure with appropriate HTTP status
    - [x] Verify rate limiter applies automatically (no extra code needed — `hooks.server.ts` covers all `/api/*`)

## Dev Notes

### Architecture Constraints

- **Route location:** `src/routes/api/news-impacts/+server.ts` — already referenced in architecture and CLAUDE.md as `GET /api/news-impacts (debug/ops)`
- **No new use case required:** This is a simple read-only ops/debug endpoint. Wire the repository directly in the route handler, consistent with how `GET /api/sector-scores` works (see `src/routes/api/sector-scores/+server.ts`).
- **Adapter naming:** The existing implementation class is `DrizzleNewsImpactAdapter` (NOT `DrizzleNewsImpactRepository`). Import from `$lib/server/contexts/news/infrastructure/db/news-impact.adapter`.
- **Port method:** Use `findAllImpacts(): Promise<NewsImpact[]>` — already implemented on `DrizzleNewsImpactAdapter`.
- **No new port needed:** The route handler can instantiate `DrizzleNewsImpactAdapter` directly, same pattern as sector-scores route.
- **Rate limiting:** Already handled globally by `hooks.server.ts` — applies to all `/api/*` routes. Do NOT add any rate-limit logic in the route itself.
- **Hexagonal rule:** No business logic in the route handler. Filtering by sector is a presentation concern (just `.filter()` on the result array), acceptable here since there's no domain logic involved.

### Existing Pattern to Follow

```typescript
// src/routes/api/sector-scores/+server.ts (reference — follow this exact pattern)
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GetLatestSectorScoresUseCase } from '$lib/server/contexts/scoring/application/use-cases/get-latest-sector-scores.use-case';
import { DrizzleSectorScoreAdapter } from '$lib/server/contexts/scoring/infrastructure/db/sector-score.adapter';

export const GET: RequestHandler = async () => {
    try {
        const repo = new DrizzleSectorScoreAdapter();
        const useCase = new GetLatestSectorScoresUseCase(repo);
        const sectors = await useCase.execute();
        return json({ sectors });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return json({ error: message, code: 500 }, { status: 500 });
    }
};
```

### Implementation Sketch

```typescript
// src/routes/api/news-impacts/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DrizzleNewsImpactAdapter } from '$lib/server/contexts/news/infrastructure/db/news-impact.adapter';

export const GET: RequestHandler = async ({ url }) => {
    try {
        const adapter = new DrizzleNewsImpactAdapter();
        const impacts = await adapter.findAllImpacts();
        const sector = url.searchParams.get('sector');
        const filtered = sector ? impacts.filter((i) => i.sector === sector) : impacts;
        return json({ impacts: filtered });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return json({ error: message, code: 500 }, { status: 500 });
    }
};
```

### Key Files

| File                                                                            | Action        | Notes                                                                  |
| ------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------- |
| `src/routes/api/news-impacts/+server.ts`                                        | **CREATE**    | New route — the only deliverable                                       |
| `src/lib/server/contexts/news/infrastructure/db/news-impact.adapter.ts`         | **READ ONLY** | `DrizzleNewsImpactAdapter` with `findAllImpacts()` already implemented |
| `src/lib/server/contexts/news/application/ports/news-impact.repository.port.ts` | **READ ONLY** | Port interface — `NewsImpactRepositoryPort` with `findAllImpacts()`    |
| `src/hooks.server.ts`                                                           | **NO TOUCH**  | Rate limiter already covers `/api/*`                                   |

### Domain Types

`NewsImpact` (from `src/lib/server/contexts/news/domain/news-impact.ts`):

- `id: string`
- `newsId: string`
- `sector: Sector` (e.g. `"TECHNOLOGY"`, `"ENERGY"`, ...)
- `impactScore: number` (range [-1, 1])
- `impactType: ImpactType` (`"STRUCTURAL"` | `"PUNCTUAL"`)

`Sector` values (from `src/lib/server/contexts/news/domain/sector.ts`): `TECHNOLOGY`, `ENERGY`, `HEALTHCARE`, `FINANCIALS`, `CONSUMER`, `INDUSTRIALS`, `MATERIALS`, `UTILITIES`, `REAL_ESTATE`, `COMMUNICATION`

### Error Response Format

Follow the existing convention (from architecture):

```json
{ "error": "message string", "code": 500 }
```

### Project Structure Notes

- Route folder `src/routes/api/news-impacts/` does not exist yet — create it with the `+server.ts` file
- The route is already planned in architecture: `/api/news-impacts — read-only, rate-limited, ops/debug only`
- No Drizzle migration needed — uses existing `news_impacts` table

### Anti-Patterns to Avoid

- ❌ Do NOT create a new use case for this (overkill for a simple debug endpoint)
- ❌ Do NOT add rate-limit logic in the route — `hooks.server.ts` already handles it globally
- ❌ Do NOT import `db` directly in the route — always go through the adapter
- ❌ Do NOT apply sector filtering inside the adapter/repository — keep it in the route handler (presentation layer concern, no domain logic)
- ❌ Do NOT return raw DB rows — `findAllImpacts()` already maps snake_case → camelCase

### Testing

This story has **no unit test required** — it's a thin wiring layer with zero business logic. The rate-limiter is already tested. The adapter is already tested. If you want to add a test, a simple integration test asserting HTTP 200 and `{ impacts: [] }` on an empty DB is sufficient but optional.

### References

- Existing route pattern: [src/routes/api/sector-scores/+server.ts](src/routes/api/sector-scores/+server.ts)
- Adapter: [src/lib/server/contexts/news/infrastructure/db/news-impact.adapter.ts](src/lib/server/contexts/news/infrastructure/db/news-impact.adapter.ts)
- Port: [src/lib/server/contexts/news/application/ports/news-impact.repository.port.ts](src/lib/server/contexts/news/application/ports/news-impact.repository.port.ts)
- Rate limiter: [src/hooks.server.ts](src/hooks.server.ts)
- Architecture API Boundaries: `_bmad-output/planning-artifacts/architecture.md` § Architectural Boundaries

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Créé `src/routes/api/news-impacts/+server.ts` — route GET read-only wiring `DrizzleNewsImpactAdapter.findAllImpacts()`
- Filtrage optionnel par `?sector=` implémenté côté handler (présentation layer, pas dans l'adapter)
- Pattern identique à `GET /api/sector-scores` — try/catch + json error response
- Rate limiting automatique via `hooks.server.ts` (aucun code additionnel nécessaire)
- TypeScript strict : 0 erreur. Suite de tests : 122/122 passent, 0 régression.

### File List

- `src/routes/api/news-impacts/+server.ts` — **CREATED**
