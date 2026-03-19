---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-19'
inputDocuments: ['_bmad-output/planning-artifacts/prd.md']
workflowType: 'architecture'
project_name: 'market-signal'
user_name: 'Thomas'
date: '2026-03-19'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
17 FRs across 5 domains: News Ingestion (FR1–3), LLM Classification (FR4–7),
Sector Scoring (FR8–11), Dashboard (FR12–15), Observability & Ops (FR16–17).
The pipeline is inherently sequential and batch-oriented — no real-time data flow.
The event store (news_impacts) is append-only and immutable, making full score
reproducibility a first-class architectural property.

**Non-Functional Requirements:**

- Performance: dashboard load < 3s (pre-computed scores), full pipeline < 30 min/day
- Security: all secrets server-side only, never client-exposed
- Resilience: Anthropic API failure must not crash the pipeline; RSS unavailability
  must be handled gracefully per feed
- Cost: daily article volume must remain bounded (Anthropic API usage is per-classification)

**Scale & Complexity:**

- Primary domain: full-stack web app (SvelteKit + PostgreSQL + LLM integration)
- Complexity level: high
- Estimated architectural components: 3 domain aggregates (NewsImpact, SectorScore,
  DecayModel), 3 ports (repository × 2, classifier), 3 use cases (ingest-news,
  compute-daily-scores, get-sector-dashboard), 3 infrastructure adapters,
  4 route handlers

### Technical Constraints & Dependencies

- Stack fixed: SvelteKit + TypeScript strict, PostgreSQL, Anthropic API (claude-sonnet)
- Architecture pattern fixed: Hexagonal + DDD, dependencies inward only
- Cron execution: SvelteKit does not natively support cron jobs — external scheduler
  or Node.js cron library required
- Single user, no auth in MVP: no session/identity layer needed
- Chrome-only, no PWA, no SEO: simplifies rendering and deployment constraints

### Cross-Cutting Concerns Identified

- **Error isolation:** pipeline failures must be contained per step (per-article
  classification failure ≠ full batch crash)
- **Logging:** cron job execution status (FR17) — structured logs needed at each
  pipeline stage
- **API cost control:** article deduplication or volume cap to prevent runaway
  Anthropic API spend
- **Testability:** hexagonal ports must be mockable for unit tests; integration
  tests need real DB (per project conventions)
- **Reproducibility:** score recomputation from raw event store must always
  be possible (FR11)

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application — SvelteKit + Node.js backend + PostgreSQL

### Starter Options Considered

N/A — project already initialized. Stack is fixed per project constraints
defined in CLAUDE.md and confirmed by PRD.

### Selected Starter: SvelteKit (already initialized)

**Rationale for Selection:**
Stack mandated by project requirements. SvelteKit provides file-based routing,
server-side rendering, server-only API routes (`+server.ts`), and native
TypeScript support — all required for the hexagonal architecture target.

**Initialization Command:**

```bash
# Already executed — project bootstrapped
npx sv create market-signal --template skeleton --type ts
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript strict mode — no `any`, kebab-case files, PascalCase classes,
camelCase variables/functions.

**Styling Solution:**
To be decided (no constraint from PRD — Tailwind CSS recommended for
mobile-friendly dashboard with minimal configuration).

**Build Tooling:**
Vite (SvelteKit default) — hot reload, ESM, optimized production build.

**Testing Framework:**
Vitest (unit + integration) + Playwright (E2E) — mandated by CLAUDE.md.

**Code Organization:**

```
src/lib/server/          ← domain + application + infrastructure
src/routes/              ← interface layer (routing only)
```

Strict hexagonal layering — domain has zero external imports.

**Development Experience:**
SvelteKit dev server with HMR, TypeScript strict, conventional commits
(`feat:` `fix:` `refactor:` `test:`).

**Note:** Project already initialized — first implementation story starts
at domain modeling, not project setup.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

- Data layer: Drizzle ORM + Drizzle Kit migrations
- Cron strategy: Vercel Cron Jobs → SvelteKit scheduled endpoint
- API error handling: custom ApiError class pattern
- Deployment target: Vercel + Neon PostgreSQL

**Important Decisions (Shape Architecture):**

- REST API (no GraphQL, no tRPC)
- Tailwind CSS for UI
- No caching layer (sector_scores IS the cache)
- In-memory rate limiting in MVP

**Deferred Decisions (Post-MVP):**

- API authentication

### Data Architecture

- **ORM:** Drizzle ORM — TypeScript-first, schema-as-code, minimal abstraction
- **Migrations:** Drizzle Kit — `drizzle-kit generate` + `drizzle-kit migrate`
- **Schema location:** `src/lib/server/infrastructure/db/schema.ts`
- **Caching:** None required — `sector_scores` materialized snapshot is the read
  cache; dashboard queries this table directly with zero runtime computation

### Authentication & Security

- **MVP:** No user authentication required (single-user personal deployment)
- **Secrets:** All credentials (Anthropic API key, DB connection string) in
  server-side environment variables only — never imported from `$env/static/public`
- **Cron protection:** Vercel automatically injects `CRON_SECRET` header on
  scheduled calls — validate in the cron endpoint handler
- **API rate limiting:** In-memory rate limiter in `hooks.server.ts` — sliding
  window per IP, applied to `/api/*` routes only. No external dependency required
  for single-instance Vercel deployment. Limit: ~60 req/min per IP.

### API & Communication Patterns

- **Style:** REST JSON via SvelteKit `+server.ts` route handlers
- **Error handling:**

```typescript
// src/lib/server/infrastructure/errors/api-error.ts
export class ApiError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string,
        public readonly cause?: unknown
    ) {
        super(message);
    }
}

// Used in catch blocks across all infrastructure adapters:
export function createApiError(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    if (error instanceof Error) return new ApiError(500, error.message, error);
    return new ApiError(500, 'Unknown error', error);
}
```

- **Response shape on error:** `{ error: string, code: number }`

### Frontend Architecture

- **CSS:** Tailwind CSS — utility-first, mobile-friendly dashboard with
  minimal configuration overhead
- **State management:** None — dashboard is read-only, data loaded server-side
  via `+page.server.ts` load function, no client-side state needed
- **Routing:** SvelteKit file-based routing (no client-side router configuration)
- **Rendering:** SSR on initial load (SvelteKit default), no client-side
  data fetching in MVP

### Infrastructure & Deployment

- **Hosting:** Vercel (SvelteKit adapter-vercel)
- **Database:** Neon PostgreSQL (serverless-compatible, Vercel integration)
- **Cron strategy:** Vercel Cron Jobs → calls `GET /api/cron/daily` on schedule
    - Configured in `vercel.json` with cron expression
    - Endpoint validates `Authorization: Bearer $CRON_SECRET` header
    - Triggers `ingest-news` → `compute-daily-scores` use cases sequentially
    - One endpoint per concern keeps the pipeline observable and restartable
- **CI/CD:** Vercel Git integration (push to main → deploy)
- **Logging:** `console.log` / `console.error` → visible in Vercel function logs

### Decision Impact Analysis

**Implementation Sequence:**

1. DB schema (Drizzle) + migrations
2. Domain models + ports
3. Infrastructure adapters (Drizzle repositories + Anthropic classifier)
4. Use cases (ingest-news, compute-daily-scores, get-sector-dashboard)
5. API routes + cron endpoint
6. Dashboard UI (Tailwind)

**Cross-Component Dependencies:**

- Drizzle schema must be defined before repositories can be implemented
- Ports must be defined before use cases (dependency inversion)
- Cron endpoint depends on both use cases being complete
- Dashboard depends only on get-sector-dashboard use case

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database Naming Conventions:**

- Tables: `snake_case` plural — `news_impacts`, `sector_scores`
- Columns: `snake_case` — `impact_score`, `published_at`, `impact_type`
- Foreign keys: `{table_singular}_id` — `news_impact_id`
- Enum values in DB: `UPPER_SNAKE_CASE` — `STRUCTURAL`, `PUNCTUAL`

**API Naming Conventions:**

- Endpoints: kebab-case plural nouns — `/api/news-impacts`, `/api/sector-scores`
- Query params: camelCase — `?sectorName=technology&limit=10`
- Cron endpoint: `/api/cron/daily`

**Code Naming Conventions:**

- Files: kebab-case — `news-impact.ts`, `decay-model.ts`
- Classes/Interfaces/Types: PascalCase — `NewsImpact`, `SectorScore`, `ImpactType`
- Variables/Functions: camelCase — `impactScore`, `computeDecay()`
- Port interfaces: suffix `Port` — `NewsImpactRepositoryPort`, `NewsClassifierPort`
- Repository implementations: suffix `Repository` — `DrizzleNewsImpactRepository`
- Use case classes: verb + noun — `IngestNewsUseCase`, `ComputeDailyScoresUseCase`
- Svelte components: PascalCase — `SectorScoreCard.svelte`, `DashboardLayout.svelte`

### Structure Patterns

**Project Organization:**

```
src/lib/server/
├── contexts/           ← tout ce qui est single-context
│   ├── news/
│   │   ├── domain/
│   │   ├── application/
│   │   └── infrastructure/
│   └── scoring/
│       ├── domain/
│       ├── application/
│       └── infrastructure/
├── cross-context/      ← orchestration multi-domaine
│   └── pipeline/
│       ├── application/
│       └── interface/
├── middleware/         ← rate-limiter, logging, etc.
└── decorators/         ← retry, timing, circuit-breaker, etc.
```

**Dependency Rules:**

- `contexts/*/domain/` — zero external imports, pure business logic only
- `contexts/*/application/` — imports own domain only, depends on ports
- `contexts/*/infrastructure/` — implements ports, imports own domain
- `cross-context/*/application/` — may import from multiple `contexts/*/domain/`
- `middleware/` and `decorators/` — must not import from any `contexts/`
- `src/routes/` — wiring only, instantiates infrastructure and injects into use cases

**Cross-Context Use Case Pattern:**
When a use case requires models or ports from multiple contexts, it becomes its
own bounded context under `cross-context/`. It gets a dedicated `application/`
folder (for the orchestrating use case) and an `interface/` folder (for the
route handler or cron trigger). The use case imports domain models from each
source context but defines its own ports if needed.

Example — `RunDailyPipelineUseCase`:

```
cross-context/pipeline/
├── application/
│   └── run-daily-pipeline.use-case.ts  ← imports from news/ and scoring/ domains
└── interface/
    └── cron-handler.ts                 ← called by /api/cron/daily
```

**Test Location:**

- Unit tests: co-located — `news-impact.test.ts` next to `news-impact.ts`
- Integration tests: `src/lib/server/contexts/**/*.integration.test.ts`
- E2E tests: `e2e/` at project root (Playwright)
- Fake/stub port implementations: `src/lib/server/contexts/*/infrastructure/fakes/`

**Configuration Files:**

- DB schema: `src/lib/server/contexts/*/infrastructure/db/schema.ts`
- DB client: `src/lib/server/infrastructure/db/client.ts` (shared)
- Drizzle config: `drizzle.config.ts` at root
- Cron config: `vercel.json` at root
- Environment types: `src/app.d.ts` (SvelteKit convention)

### Format Patterns

**API Response Formats:**

- Success: direct object or array — `{ sectors: SectorScore[] }`
- Error: `{ error: string, code: number }`
- No envelope wrapper on success responses

**Data Exchange Formats:**

- Dates: ISO 8601 strings in JSON — `"2026-03-19T00:00:00.000Z"`
- Scores: number, range [-1, 1] for impact, unbounded for sector score
- Sector: string enum — `"TECHNOLOGY"`, `"ENERGY"`, `"HEALTHCARE"`, etc.
- ImpactType: `"STRUCTURAL"` | `"PUNCTUAL"`

**Drizzle ↔ Domain mapping:**

- DB rows use snake_case columns → always mapped to camelCase domain objects
  at the repository boundary — domain layer never sees snake_case

### Process Patterns

**Error Handling:**

- Infrastructure adapters: wrap all errors with `createApiError()`
- Use cases: let `ApiError` propagate, catch unknown errors only
- Route handlers: `try/catch` → return `json({ error, code }, { status })`
- Never swallow errors silently — always `console.error` before re-throw
- Pipeline steps: catch per-article errors, log and continue (don't abort batch)

**Logging:**

- Format: `[PIPELINE] step-name: message` for cron pipeline stages
- Use `console.log` for success milestones, `console.error` for failures
- Always log: articles fetched count, classified count, scores computed count

**Dependency Injection:**

- Use cases receive ports via constructor — never instantiate adapters inside use cases
- Route handlers and cron handlers instantiate concrete adapters and inject into use cases
- No DI container — manual wiring in `+server.ts` and cron interface handlers

### Enforcement Guidelines

**All AI Agents MUST:**

- Never import anything from outside `domain/` within a domain file
- Never put business logic in route handlers — delegate to use cases
- Never query the DB in route handlers — always via use case → port → repository
- Always map DB snake_case to domain camelCase at the repository boundary
- Always validate `CRON_SECRET` header before executing the cron endpoint
- Only create a `cross-context/` entry when a use case genuinely spans multiple contexts

**Anti-Patterns:**

- ❌ `import { db } from '../../infrastructure/db/client'` inside a domain file
- ❌ Business logic inside `+server.ts` route handlers
- ❌ `new DrizzleNewsImpactRepository()` inside a use case
- ❌ Returning raw DB rows (snake_case) from a repository method
- ❌ Catching errors silently without logging
- ❌ Importing from `contexts/news/` inside `contexts/scoring/` — use cross-context instead

## Project Structure & Boundaries

### Complete Project Directory Structure

```
market-signal/
├── package.json
├── tsconfig.json
├── svelte.config.ts
├── vite.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
├── vercel.json                          ← cron schedule config
├── .env.example
├── .gitignore
├── playwright.config.ts
│
├── drizzle/
│   └── migrations/                      ← Drizzle Kit generated migrations
│
├── e2e/                                 ← Playwright E2E tests
│   └── dashboard.spec.ts
│
└── src/
    ├── app.d.ts                         ← SvelteKit env types
    ├── hooks.server.ts                  ← rate-limiter middleware
    │
    ├── lib/
    │   ├── components/                  ← Svelte UI components
    │   │   ├── sector-score-card/       ← 1 dossier par composant
    │   │   │   ├── SectorScoreCard.svelte
    │   │   │   ├── sector-score-card.utils.ts
    │   │   │   └── sector-score-card.utils.test.ts
    │   │   ├── reliability-indicator/
    │   │   │   ├── ReliabilityIndicator.svelte
    │   │   │   ├── reliability-indicator.utils.ts
    │   │   │   └── reliability-indicator.utils.test.ts
    │   │   ├── dashboard-layout/        ← Story 4.4
    │   │   │   └── DashboardLayout.svelte
    │   │   └── ui/                     ← shadcn-svelte primitives
    │   │
    │   └── server/
    │       ├── contexts/
    │       │   ├── news/
    │       │   │   ├── domain/
    │       │   │   │   ├── news-impact.ts           ← aggregate
    │       │   │   │   ├── impact-type.ts           ← enum STRUCTURAL | PUNCTUAL
    │       │   │   │   ├── sector.ts                ← enum des secteurs
    │       │   │   │   └── news-impact.test.ts
    │       │   │   ├── application/
    │       │   │   │   ├── ports/
    │       │   │   │   │   ├── news-impact.repository.port.ts
    │       │   │   │   │   └── news-classifier.port.ts
    │       │   │   │   └── use-cases/
    │       │   │   │       ├── ingest-news.use-case.ts
    │       │   │   │       └── ingest-news.use-case.test.ts
    │       │   │   └── infrastructure/
    │       │   │       ├── db/
    │       │   │       │   ├── news-impact.repository.ts
    │       │   │       │   ├── news-impact.schema.ts
    │       │   │       │   └── news-impact.repository.integration.test.ts
    │       │   │       ├── llm/
    │       │   │       │   └── anthropic-classifier.ts
    │       │   │       └── fakes/
    │       │   │           ├── fake-news-impact.repository.ts
    │       │   │           └── fake-news-classifier.ts
    │       │   │
    │       │   └── scoring/
    │       │       ├── domain/
    │       │       │   ├── sector-score.ts          ← aggregate
    │       │       │   ├── decay-model.ts           ← formule λ
    │       │       │   └── decay-model.test.ts
    │       │       ├── application/
    │       │       │   ├── ports/
    │       │       │   │   ├── sector-score.repository.port.ts
    │       │       │   │   └── news-impact.read.port.ts  ← read-only, owned by scoring
    │       │       │   └── use-cases/
    │       │       │       ├── compute-daily-scores.use-case.ts
    │       │       │       └── compute-daily-scores.use-case.test.ts
    │       │       └── infrastructure/
    │       │           ├── db/
    │       │           │   ├── sector-score.repository.ts
    │       │           │   ├── sector-score.schema.ts
    │       │           │   └── sector-score.repository.integration.test.ts
    │       │           └── fakes/
    │       │               └── fake-sector-score.repository.ts
    │       │
    │       ├── cross-context/
    │       │   └── pipeline/
    │       │       ├── application/
    │       │       │   └── run-daily-pipeline.use-case.ts  ← orchestre news + scoring
    │       │       └── interface/
    │       │           └── cron-handler.ts
    │       │
    │       ├── middleware/
    │       │   └── rate-limiter.ts                  ← sliding window per IP
    │       │
    │       ├── decorators/                          ← retry, timing (post-MVP)
    │       │
    │       └── shared/
    │           └── db/
    │               └── client.ts                    ← Drizzle db instance (partagé)
    │
    └── routes/
        ├── +layout.svelte
        ├── dashboard/
        │   ├── +page.svelte
        │   └── +page.server.ts          ← load() → get-sector-dashboard
        └── api/
            ├── sector-scores/
            │   └── +server.ts           ← GET /api/sector-scores
            ├── news-impacts/
            │   └── +server.ts           ← GET /api/news-impacts (debug/ops)
            └── cron/
                └── daily/
                    └── +server.ts       ← GET /api/cron/daily (Vercel Cron)
```

### Architectural Boundaries

**API Boundaries:**

- `/api/cron/daily` — internal only, protected by `CRON_SECRET` header
- `/api/sector-scores` — read-only, rate-limited, serves dashboard data
- `/api/news-impacts` — read-only, rate-limited, ops/debug only
- `/dashboard` — SSR page, no client-side data fetching

**Data Boundaries:**

- `news_impacts` — append-only, written by `IngestNewsUseCase`, read by `ComputeDailyScoresUseCase`
- `sector_scores` — overwritten daily by `ComputeDailyScoresUseCase`, read by dashboard
- DB client is shared infrastructure — instantiated once in `shared/db/client.ts`

**Context Boundaries:**

- `contexts/news/` owns: `NewsImpact`, `ImpactType`, `Sector`, ingestion + classification
- `contexts/scoring/` owns: `SectorScore`, `DecayModel`, score computation
- `cross-context/pipeline/` owns: daily pipeline orchestration, cron trigger
- `middleware/` owns: rate limiting applied in `hooks.server.ts`

### Requirements to Structure Mapping

| FR                       | File                                                               |
| ------------------------ | ------------------------------------------------------------------ |
| FR1–2 News fetch         | `contexts/news/infrastructure/` (RSS adapter)                      |
| FR3 Autonomous cron      | `cross-context/pipeline/interface/cron-handler.ts` + `vercel.json` |
| FR4–6 LLM classification | `contexts/news/infrastructure/llm/anthropic-classifier.ts`         |
| FR7 Append-only store    | `contexts/news/infrastructure/db/news-impact.repository.ts`        |
| FR8–9 Decay scoring      | `contexts/scoring/domain/decay-model.ts`                           |
| FR10 Daily snapshot      | `contexts/scoring/infrastructure/db/sector-score.repository.ts`    |
| FR11 Recomputation       | `run-daily-pipeline.use-case.ts` (replayable from event store)     |
| FR12–15 Dashboard        | `src/routes/dashboard/` + `src/lib/components/`                    |
| FR16 DB inspection       | Direct Neon/psql — no app layer needed                             |
| FR17 Cron logging        | `console.log/error` in `run-daily-pipeline.use-case.ts`            |

### Data Flow

```
[vercel.json cron] → GET /api/cron/daily
  → cron-handler.ts (validates CRON_SECRET)
    → RunDailyPipelineUseCase
      → IngestNewsUseCase
          → RSS fetch → AnthropicClassifier → NewsImpactRepository.save()
      → ComputeDailyScoresUseCase
          → NewsImpactRepository.findAll() → DecayModel → SectorScoreRepository.upsert()

[browser] → GET /dashboard
  → +page.server.ts load()
    → SectorScoreRepository.findLatest()
      → SectorScoreCard × N
```

### External Integrations

- **Anthropic API** — `contexts/news/infrastructure/llm/anthropic-classifier.ts`
- **RSS feeds** — `contexts/news/infrastructure/rss/` (adapter)
- **Neon PostgreSQL** — `shared/db/client.ts` via `DATABASE_URL` env var
- **Vercel Cron** — `vercel.json` + `CRON_SECRET` env var

## Architecture Validation Results

### Coherence Validation ✅

All technology choices are compatible: SvelteKit + Vite + Drizzle ORM + Neon
PostgreSQL + Vercel Cron form a proven production stack. Tailwind integrates
natively with SvelteKit. Vitest is bundled with Vite. No contradictory decisions
detected across all 6 completed sections.

Naming conventions are consistent: kebab-case files, PascalCase classes,
snake_case DB columns, UPPER_SNAKE_CASE enums. Dependency injection manual
wiring aligns with the absence of a DI container (appropriate for project scale).

### Requirements Coverage Validation ✅

All 17 functional requirements mapped to specific files in the project structure.
All 4 NFR categories addressed:

- Performance: pre-computed sector_scores, zero runtime calculation
- Security: server-only secrets, CRON_SECRET validation, in-memory rate limiter
- Resilience: per-article error isolation in pipeline, graceful RSS failure handling
- Cost control: article volume bounding responsibility placed in IngestNewsUseCase

### Gap Analysis Results

**Important (address in stories):**

- RssFetcherPort not yet named — lives in `contexts/news/application/ports/rss-fetcher.port.ts`,
  adapter in `contexts/news/infrastructure/rss/rss-fetcher.ts`
- GetSectorDashboard: dedicated use case `GetSectorDashboardUseCase` in
  `contexts/scoring/application/use-cases/get-sector-dashboard.use-case.ts`,
  called from `+page.server.ts` load function

**Minor:**

- Sector enum values not enumerated — define in `sector.ts` story
- λ values for STRUCTURAL vs PUNCTUAL not specified — define in `decay-model.ts` story

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**

- [x] Critical decisions documented
- [x] Technology stack fully specified (SvelteKit, Drizzle, Neon, Vercel, Tailwind)
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined (contexts + cross-context + middleware + decorators)
- [x] Cross-context use case pattern documented
- [x] Error handling patterns specified
- [x] Dependency injection pattern documented

**✅ Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete (FR1–FR17)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**

- Append-only event store guarantees full score reproducibility
- Hexagonal architecture with strict context isolation enables safe parallel development
- Cross-context pattern cleanly handles pipeline orchestration without coupling domains
- Vercel Cron + scheduled endpoint keeps infrastructure simple for solo deployment

**Areas for Future Enhancement:**

- Decorators (retry, circuit-breaker) for Anthropic API resilience — post-MVP
- API authentication — post-MVP
- Score history visualization requires schema extension — Phase 3
