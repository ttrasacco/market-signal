---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/planning-artifacts/ux-design-directions.html'
---

# market-signal - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for market-signal, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: The system fetches financial news articles from configured RSS feeds on a daily schedule
FR2: The system stores raw ingested articles before classification
FR3: The ingestion pipeline runs autonomously without manual intervention
FR4: The system classifies each article with a target economic sector
FR5: The system assigns each article an impact score between -1 and 1
FR6: The system classifies each article as STRUCTURAL or PUNCTUAL impact type
FR7: The system persists each classified article as an immutable event in the event store
FR8: The system computes a decay-weighted score for each sector from accumulated news impacts
FR9: The system applies a low decay rate (λ) to STRUCTURAL events and a high decay rate to PUNCTUAL events
FR10: The system produces a daily materialized score snapshot per sector
FR11: The system can recompute historical scores from the event store at any point
FR12: The user can view all sector scores in a single overview
FR13: The user can visually distinguish sectors trending positively from sectors trending negatively
FR14: The user can access the dashboard from a mobile browser
FR15: The dashboard serves pre-computed scores — no runtime calculation
FR16: The user can inspect raw classified events in the event store directly via DB
FR17: The system logs cron job execution status (success/failure)

### NonFunctional Requirements

NFR1: Dashboard initial load completes within 3 seconds on a standard broadband connection
NFR2: Sector scores served from pre-computed snapshots — zero query computation at request time
NFR3: Daily pipeline (ingestion + classification + scoring) completes within 30 minutes
NFR4: Anthropic API key and database credentials stored as server-side environment variables only — never client-exposed, never committed to version control
NFR5: RSS feed sources limited to public, authorized feeds
NFR6: Anthropic API failure: log error, skip affected batch, do not crash the pipeline
NFR7: RSS feed unavailability: handle gracefully without blocking the full ingestion run

### Additional Requirements

- **Project already initialized**: SvelteKit skeleton already bootstrapped — first story starts at domain modeling, not project setup
- **ORM & Migrations**: Drizzle ORM + Drizzle Kit — `drizzle-kit generate` + `drizzle-kit migrate`; schema at `src/lib/server/contexts/*/infrastructure/db/schema.ts`; shared DB client at `src/lib/server/shared/db/client.ts`
- **Cron strategy**: Vercel Cron Jobs → `GET /api/cron/daily`; `vercel.json` cron config; endpoint validates `Authorization: Bearer $CRON_SECRET` header
- **Deployment**: Vercel (adapter-vercel) + Neon PostgreSQL; CI/CD via Vercel Git integration
- **Rate limiting**: In-memory sliding window rate limiter in `hooks.server.ts`, applied to `/api/*` routes only (~60 req/min per IP)
- **API error handling**: `ApiError` class + `createApiError()` helper in `src/lib/server/infrastructure/errors/api-error.ts`
- **Logging format**: `[PIPELINE] step-name: message` pattern; always log articles fetched/classified/scored counts
- **Dependency injection**: Manual wiring in `+server.ts` and cron interface handlers — no DI container
- **RssFetcherPort**: `contexts/news/application/ports/rss-fetcher.port.ts`; adapter in `contexts/news/infrastructure/rss/rss-fetcher.ts`
- **GetSectorDashboard use case**: `contexts/scoring/application/use-cases/get-sector-dashboard.use-case.ts`, called from `+page.server.ts` load function
- **Sector enum**: define values in `sector.ts` story (e.g. TECHNOLOGY, ENERGY, HEALTHCARE, etc.)
- **λ values**: define STRUCTURAL vs PUNCTUAL decay constants in `decay-model.ts` story
- **Test strategy**: unit tests co-located; integration tests use real DB; fakes in `infrastructure/fakes/`

### UX Design Requirements

UX-DR1: Implement the full color token system in Tailwind CSS: `--color-bg` (#0F0F11), `--color-surface` (#1A1A1F), `--color-surface-elevated` (#242429), `--color-border` (#2E2E35), `--color-text-primary` (#F0F0F2), `--color-text-secondary` (#8A8A96), `--color-green` (#22C55E), `--color-orange` (#F59E0B), `--color-red` (#EF4444)
UX-DR2: Install and configure shadcn-svelte as the component primitive library on top of Tailwind CSS, customized to the dark/minimal theme
UX-DR3: Implement Inter font with system-ui fallback; apply typography scale: sector name 500/16px, narrative label 400/12px uppercase text-secondary, section headings 600/13px uppercase text-secondary
UX-DR4: Implement the Ripple Cast visual component: inner ring = PUNCTUAL signal, outer ripples = STRUCTURAL signal, each with independent green/orange/red color; encodes 9 distinct market states
UX-DR5: Implement the narrative label system: 9 static labels derived from PUNCTUAL color × STRUCTURAL color combination (e.g. "Confirmed momentum", "Widespread deterioration", etc.) — no LLM at display time
UX-DR6: Implement the sector reliability indicator: multi-criteria icon (4 criteria: total articles, recent articles, source diversity, PUNCTUAL proportion); icon color = worst criterion; red/orange/green thresholds per criterion
UX-DR7: Desktop reliability dropdown: clicking/hovering reliability icon shows dropdown listing all 4 criteria with individual colors (uses `--color-surface-elevated` background); keyboard accessible
UX-DR8: Implement dashboard layout: Highlights zone (top 3 bullish + bottom 3 bearish, reliable sectors only, score > 0 / < 0) + full sector table below (all sectors ordered by score, low-reliability at bottom with dimmed opacity)
UX-DR9: Empty state for highlights zone: contextual message (e.g. "No significant sectoral pressure detected") when no sector meets the score threshold
UX-DR10: Mobile-responsive layout: single-column card grid, reduced card padding (12px mobile vs 16px desktop), same information hierarchy, icon color only on reliability (no dropdown on mobile)
UX-DR11: Page max-width 640px centered; card gap 12px; 32px gap + `--color-border` horizontal rule between highlights and full sector table; base spacing unit 4px
UX-DR12: WCAG AA contrast compliance: all text/background combinations ≥ 4.5:1 ratio; signal colors never sole differentiator (always paired with position or label text)

### FR Coverage Map

```
FR1:  Epic 2 — Fetch RSS feeds on daily schedule
FR2:  Epic 1 — Raw article storage in event store schema
FR3:  Epic 2 — Autonomous cron via Vercel Cron + /api/cron/daily
FR4:  Epic 2 — LLM classifies sector per article
FR5:  Epic 2 — LLM assigns impact score [-1, 1]
FR6:  Epic 2 — LLM classifies STRUCTURAL | PUNCTUAL
FR7:  Epic 1 — Append-only immutable persistence (repository + schema)
FR8:  Epic 3 — Decay-weighted sector score computation
FR9:  Epic 3 — Differentiated λ for STRUCTURAL vs PUNCTUAL
FR10: Epic 3 — Daily materialized snapshot (sector_scores table)
FR11: Epic 3 — Score recomputation from raw event store
FR12: Epic 4 — Sector score overview on dashboard
FR13: Epic 4 — Visual distinction bullish/bearish (Ripple Cast + color)
FR14: Epic 4 — Mobile browser access
FR15: Epic 4 — Dashboard reads pre-computed scores only
FR16: Epic 5 — Direct DB inspection (Neon/psql)
FR17: Epic 2/5 — Cron execution logs
```

## Epic List

### Epic 1: Foundation — Project Infrastructure & Domain Setup
Establish the complete technical foundation: database schema, domain models, ports, fakes, shared infrastructure, and error handling patterns — enabling all subsequent epics to build on a solid, tested base.
**FRs covered:** FR2, FR7, FR11

### Epic 2: Autonomous Daily Ingestion Pipeline
The system autonomously fetches financial news from RSS feeds, classifies each article via LLM (sector, impact score, impact type), and persists results as immutable events — zero manual intervention required.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR17

### Epic 3: Sector Scoring Engine
The system computes daily decay-weighted conviction scores per sector using the STRUCTURAL/PUNCTUAL differentiated model and materializes them as queryable snapshots — ready for the dashboard to consume.
**FRs covered:** FR8, FR9, FR10, FR11, FR15, FR17

### Epic 4: Dashboard — Sector Conviction at a Glance
The user opens the dashboard on any morning and reads sector conviction in under 30 seconds — on desktop or mobile — with visual highlights, Ripple Cast encoding, reliability indicators, and zero interaction required.
**FRs covered:** FR12, FR13, FR14, FR15

### Epic 5: Observability & Production Readiness
The system provides structured logging, deployment configuration, and direct DB inspection capability so the user can diagnose failures, trust autonomous operation, and deploy confidently to Vercel.
**FRs covered:** FR16, FR17, NFR1–NFR7

---

## Epic 5: Observability & Production Readiness

The system provides structured logging, deployment configuration, and direct DB inspection capability so the user can diagnose failures, trust autonomous operation, and deploy confidently to Vercel.

### Story 5.1: `GET /api/news-impacts` — ops/debug endpoint

As a developer,
I want a `GET /api/news-impacts` route that exposes raw classified events,
So that I can inspect classification results directly from a browser or curl without needing psql access.

**Acceptance Criteria:**

**Given** `GET /api/news-impacts` receives a request
**When** the route handler calls the repository
**Then** it returns HTTP 200 with `{ impacts: NewsImpact[] }` — all records from the event store
**And** the response is read-only — no mutation possible via this endpoint

**Given** the endpoint is called 61 times in one minute from the same IP
**When** the 61st request arrives
**Then** `hooks.server.ts` returns HTTP 429

**Given** an optional `?sector=TECHNOLOGY` query param is provided
**When** the handler filters
**Then** only impacts for that sector are returned

### Story 5.2: Vercel deployment configuration & environment validation

As a developer,
I want `vercel.json`, `.env.example`, and `src/app.d.ts` fully configured,
So that the app deploys cleanly to Vercel with Neon PostgreSQL and all required environment variables are documented and typed.

**Acceptance Criteria:**

**Given** `vercel.json` exists at project root
**When** it is read
**Then** it contains: `adapter-vercel` configuration, the daily cron schedule, and no hardcoded secrets

**Given** `.env.example` exists
**When** it is read
**Then** it documents all required env vars: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `CRON_SECRET`
**And** all values are placeholders — no real credentials

**Given** `src/app.d.ts` is updated
**When** TypeScript compiles
**Then** `DATABASE_URL`, `ANTHROPIC_API_KEY`, and `CRON_SECRET` are typed under `App.Env` (SvelteKit private env convention)
**And** none of these vars are accessible from client-side code

**Given** the app is deployed to Vercel
**When** a request hits `/dashboard`
**Then** the page loads in under 3 seconds on standard broadband (NFR1)

### Story 5.3: E2E smoke test — dashboard loads with sector scores

As a developer,
I want a Playwright E2E smoke test that verifies the dashboard loads and displays sector scores,
So that regressions in the full stack (DB → use case → SSR → render) are caught automatically.

**Acceptance Criteria:**

**Given** a Playwright test in `e2e/dashboard.spec.ts`
**When** the test navigates to `/dashboard`
**Then** the page title or main heading is visible
**And** at least one sector card is rendered (assumes seeded DB or mock data)
**And** no JS console errors are thrown on load

**Given** the `sector_scores` table is empty
**When** the E2E test runs
**Then** the dashboard renders the empty state without crashing
**And** the page still loads within 3 seconds (NFR1)

---

## Epic 4: Dashboard — Sector Conviction at a Glance

The user opens the dashboard on any morning and reads sector conviction in under 30 seconds — on desktop or mobile — with visual highlights, Ripple Cast encoding, reliability indicators, and zero interaction required.

> **Visual reference:** A full HTML mockup of the intended design is available at `_bmad-output/planning-artifacts/ux-design-directions.html`. Every story in this epic must be implemented in accordance with that reference — colors, spacing, typography, component structure, and layout are all defined there. Open the file in a browser before starting any story in this epic.

### Story 4.1: Design system setup — Tailwind tokens, shadcn-svelte, typography

As a developer,
I want Tailwind CSS configured with the full dark color token system, shadcn-svelte installed, and Inter font applied,
So that all dashboard components share a consistent visual foundation from the start.

> **Reference:** `ux-design-directions.html` — `:root` CSS variables, body font, and base background.

**Acceptance Criteria:**

**Given** `tailwind.config.ts` is updated
**When** the app builds
**Then** the 9 custom color tokens are available as Tailwind utilities: `bg-color-bg`, `bg-color-surface`, `text-color-text-primary`, `text-color-green`, etc.
**And** the base background (`#0F0F11`) is applied to the root layout

**Given** shadcn-svelte is installed
**When** components are scaffolded
**Then** they use the custom dark theme tokens rather than shadcn defaults

**Given** Inter is configured as the primary font with system-ui fallback
**When** any text renders
**Then** sector names render at 500/16px, narrative labels at 400/12px uppercase, section headings at 600/13px uppercase

### Story 4.2: SectorScoreCard component — Ripple Cast visual + narrative label

As a user,
I want each sector card to display a Ripple Cast visual encoding PUNCTUAL (inner ring) and STRUCTURAL (outer ripples) signals with independent colors, plus a narrative label,
So that I can read sector conviction state at a glance without understanding the decay formula.

> **Reference:** `ux-design-directions.html` — sector card markup, Ripple Cast SVG/CSS structure, narrative label placement and typography.

**Acceptance Criteria:**

**Given** a `SectorScoreCard` receives a `SectorScore` with PUNCTUAL and STRUCTURAL sub-scores
**When** it renders
**Then** the inner ring color reflects the PUNCTUAL score (green/orange/red thresholds)
**And** the outer ripples color reflects the STRUCTURAL score (green/orange/red thresholds)
**And** the two colors are independently determined

**Given** the Ripple Cast shows a specific PUNCTUAL × STRUCTURAL color combination
**When** the narrative label is derived
**Then** it matches the 9-state lookup table (e.g. green × green → "Confirmed momentum", red × red → "Widespread deterioration")
**And** the label is computed statically at render time — no LLM call

**Given** the card renders on mobile
**When** viewport width is below the mobile breakpoint
**Then** card padding is 12px and visual weight is reduced while information hierarchy is preserved

### Story 4.3: Reliability indicator — multi-criteria icon + desktop dropdown

As a user,
I want a reliability icon on each sector card that shows signal trustworthiness at a glance, with a detailed breakdown dropdown on desktop,
So that I know when to trust a score and when to discount it due to insufficient data.

> **Reference:** `ux-design-directions.html` — reliability icon position on card, dropdown markup and colors, mobile vs desktop behavior.

**Acceptance Criteria:**

**Given** a sector has `NewsImpact` metadata (total count, recent count, source count, PUNCTUAL proportion)
**When** the reliability icon renders
**Then** its color = worst of the 4 criteria: red if any criterion is red, else orange if any is orange, else green
**And** the 4 criteria thresholds are applied: total articles (< 5 red, 5–20 orange, > 20 green), recent 7-day (< 2 red, 2–5 orange, > 5 green), source diversity (1 red, 2–3 orange, > 3 green), PUNCTUAL proportion (> 70% red, 35–70% orange, < 35% green)

**Given** the user clicks or hovers the reliability icon on desktop
**When** the dropdown opens
**Then** all 4 criteria are listed with their individual colors
**And** the dropdown background uses `--color-surface-elevated` (`#242429`)
**And** it is keyboard accessible (focus, Enter/Space to open, Escape to close)

**Given** the viewport is mobile
**When** the reliability icon renders
**Then** only the icon color is shown — no dropdown, no tooltip

### Story 4.4: Dashboard layout — highlights zone + full sector table + page.server.ts

As a user,
I want the dashboard to show a highlights zone (top 3 bullish + bottom 3 bearish) above a full sector table ordered by score, with low-reliability sectors deprioritized,
So that I get an immediate directional read at the top, and full context below.

> **Reference:** `ux-design-directions.html` — overall page layout, highlights zone structure, sector table ordering, divider between zones, topbar, empty state messaging, mobile/desktop responsive behavior.

**Acceptance Criteria:**

**Given** the dashboard loads via `+page.server.ts`
**When** `GetSectorDashboardUseCase.execute()` returns scores
**Then** SSR delivers pre-computed data — no client-side fetch, zero runtime calculation

**Given** sectors with score > 0 and green/orange reliability exist
**When** the highlights zone renders
**Then** the top 3 bullish sectors (highest score, reliable only) appear in the bullish section
**And** the bottom 3 bearish sectors (lowest score < 0, reliable only) appear in the bearish section
**And** each highlight card shows: sector name, Ripple Cast visual, narrative label

**Given** no sector has score > 0 or all qualifying sectors have red reliability
**When** the highlights zone renders
**Then** a contextual empty state message appears (e.g. "No significant sectoral pressure detected")

**Given** the full sector table renders below the highlights zone
**When** sectors are ordered
**Then** they are sorted by descending score
**And** red-reliability sectors appear at the bottom with dimmed opacity
**And** a 32px gap + `--color-border` horizontal rule visually separates highlights from the table

**Given** the page is viewed on mobile
**When** the layout renders
**Then** single-column card grid, page max-width 640px centered, card gap 12px

**Given** all text/background combinations are rendered
**When** checked against WCAG AA
**Then** all combinations meet ≥ 4.5:1 contrast ratio
**And** signal colors are never the sole differentiator (always paired with position or label text)

---

## Epic 3: Sector Scoring Engine

The system computes daily decay-weighted conviction scores per sector using the STRUCTURAL/PUNCTUAL differentiated model and materializes them as queryable snapshots — ready for the dashboard to consume.

### Story 3.1: NewsImpact read port & ComputeDailyScoresUseCase

As a developer,
I want a `NewsImpactReadPort` owned by the scoring context and a `ComputeDailyScoresUseCase` that reads all impacts, applies the decay model, and upserts sector scores,
So that the scoring engine is fully decoupled from the news context and produces a fresh daily snapshot.

**Acceptance Criteria:**

**Given** `news-impact.read.port.ts` is defined in `contexts/scoring/application/ports/`
**When** imported from within the scoring context
**Then** it exposes `findAllImpacts(): Promise<NewsImpact[]>` — read-only, owned by scoring, no write capability

**Given** `ComputeDailyScoresUseCase` is constructed with `NewsImpactReadPort` and `SectorScoreRepositoryPort`
**When** `execute(date: Date)` is called
**Then** it reads all `NewsImpact` records via the read port
**And** groups them by sector
**And** for each sector, computes `Score = Σ impactScore_i × e^(-λ_i × ageInDays_i)` where λ depends on `impactType`
**And** upserts one `SectorScore` per sector for the given date

**Given** the event store contains zero impacts for a sector
**When** `execute()` runs
**Then** that sector produces a score of 0 (or is omitted — consistent behavior documented)

**Given** unit tests use `FakeNewsImpactRepository` (as read port) and `FakeSectorScoreRepository`
**When** vitest runs
**Then** tests verify: correct decay formula applied per impact type, multi-sector aggregation, idempotency (calling execute twice for same date = same result)

### Story 3.2: GetSectorDashboardUseCase & API route

As a developer,
I want a `GetSectorDashboardUseCase` and a `GET /api/sector-scores` route,
So that the dashboard can retrieve the latest pre-computed sector scores with zero runtime calculation.

**Acceptance Criteria:**

**Given** `GetSectorDashboardUseCase` is constructed with `SectorScoreRepositoryPort`
**When** `execute()` is called
**Then** it returns `SectorScore[]` for the most recent date available in the snapshot table
**And** all sectors are included in the result (no filtering at this layer)

**Given** `GET /api/sector-scores` receives a request
**When** the route handler calls `GetSectorDashboardUseCase.execute()`
**Then** it returns HTTP 200 with `{ sectors: SectorScore[] }` — direct snapshot read, zero computation
**And** the response contains only data already materialized in `sector_scores`

**Given** the `sector_scores` table is empty (warm-up period)
**When** `GET /api/sector-scores` is called
**Then** it returns HTTP 200 with `{ sectors: [] }` — no error

**Given** the route is called 61 times in one minute from the same IP
**When** the 61st request arrives
**Then** `hooks.server.ts` returns HTTP 429 (rate limiter from Story 1.1)

### Story 3.3: RunDailyPipelineUseCase — scoring step wired

As a developer,
I want `RunDailyPipelineUseCase` extended to call `ComputeDailyScoresUseCase` after ingestion,
So that the daily cron triggers the complete pipeline: ingest → score — in a single autonomous run.

**Acceptance Criteria:**

**Given** `RunDailyPipelineUseCase.execute()` runs
**When** `IngestNewsUseCase` completes successfully
**Then** `ComputeDailyScoresUseCase.execute(today)` is called immediately after
**And** logs `[PIPELINE] scoring: Z sector scores computed` upon completion

**Given** `IngestNewsUseCase` fails with an unhandled error
**When** the pipeline catches it
**Then** `ComputeDailyScoresUseCase` is still attempted (scoring can run on existing event store data)
**And** both errors are logged independently

**Given** the cron endpoint returns its summary
**When** both steps have run
**Then** the response includes `{ articlesIngested: number, impactsStored: number, scoresComputed: number }`

---

## Epic 2: Autonomous Daily Ingestion Pipeline

The system autonomously fetches financial news from RSS feeds, classifies each article via LLM (returning one or more sector impacts per article), and persists results as immutable events — zero manual intervention required.

### Story 2.1: RSS Fetcher — Port & adapter

As a developer,
I want an `RssFetcherPort` with a real RSS adapter and a fake,
So that the ingestion use case can fetch articles without depending on a specific HTTP library, and tests can run offline.

**Acceptance Criteria:**

**Given** `rss-fetcher.port.ts` defines the port
**When** imported from `contexts/news/application/`
**Then** it exposes `fetchArticles(feedUrl: string): Promise<RawArticle[]>` where `RawArticle` contains at minimum `publishedAt`, `source`, `headline`

**Given** `RssFetcher` implements the port in `infrastructure/rss/`
**When** called with a valid RSS feed URL
**Then** it returns parsed articles with `publishedAt`, `source`, and `headline` populated
**And** if the feed is unavailable, it throws a catchable error (does not crash the process)

**Given** `FakeRssFetcher` exists in `infrastructure/fakes/`
**When** used in unit tests
**Then** it returns a configurable list of `RawArticle` without any HTTP call

### Story 2.2: Anthropic Classifier — Port & adapter

As a developer,
I want a `NewsClassifierPort` with an Anthropic adapter and a fake,
So that the ingestion use case can classify articles without depending on the Anthropic SDK directly, and tests can run without API calls.

**Acceptance Criteria:**

**Given** `news-classifier.port.ts` defines the port
**When** imported from `contexts/news/application/`
**Then** it exposes `classify(headline: string): Promise<NewsClassification[]>` where `NewsClassification` = `{ sector: Sector, impactScore: number, impactType: ImpactType }`
**And** the return type is an array — one article can produce multiple classifications

**Given** `AnthropicClassifier` implements the port in `infrastructure/llm/`
**When** called with a headline
**Then** it sends a prompt to `claude-sonnet` requesting a JSON array of `{ sector, impactScore, impactType }`
**And** each `impactScore` in the response is within [-1, 1]
**And** each `sector` is a valid `Sector` enum value

**Given** the Anthropic API returns an error
**When** `classify()` is called
**Then** it throws a catchable `ApiError` — it does not crash the process

**Given** `FakeNewsClassifier` exists in `infrastructure/fakes/`
**When** used in unit tests
**Then** it returns a configurable `NewsClassification[]` without any HTTP call

### Story 2.3: IngestNewsUseCase — orchestration fetch → classify → persist

As a developer,
I want the `IngestNewsUseCase` that orchestrates RSS fetch → LLM classification → event store persistence,
So that a single use case call triggers the full ingestion pipeline for all configured feeds.

**Acceptance Criteria:**

**Given** `IngestNewsUseCase` is constructed with `RssFetcherPort`, `NewsClassifierPort`, `NewsImpactRepositoryPort`, and a list of feed URLs
**When** `execute()` is called
**Then** it fetches articles from all configured feeds
**And** for each article, calls `classify(headline)` to get `NewsClassification[]`
**And** creates one `News` + one `NewsImpact` per classification result
**And** persists each `News` + its `NewsImpact[]` via the repository

**Given** the classifier throws for one article
**When** `execute()` continues
**Then** the failing article is skipped and logged with `console.error`
**And** the pipeline continues processing remaining articles (no batch abort)

**Given** a feed URL is unreachable
**When** `execute()` continues
**Then** that feed is skipped and logged
**And** other feeds are still processed

**Given** unit tests for `IngestNewsUseCase` use `FakeRssFetcher`, `FakeNewsClassifier`, `FakeNewsImpactRepository`
**When** vitest runs
**Then** tests verify: correct number of `NewsImpact` created per article × classifications, error isolation per article, empty feed handling

### Story 2.4: Cron endpoint & RunDailyPipelineUseCase — wiring & scheduling

As a developer,
I want the `GET /api/cron/daily` endpoint wired to `RunDailyPipelineUseCase` and configured in `vercel.json`,
So that Vercel Cron triggers the full pipeline autonomously every day without manual intervention.

**Acceptance Criteria:**

**Given** `vercel.json` contains a cron entry
**When** the schedule fires
**Then** Vercel calls `GET /api/cron/daily` with `Authorization: Bearer $CRON_SECRET`

**Given** the cron endpoint receives a request
**When** the `Authorization` header is missing or incorrect
**Then** it returns HTTP 401 without executing the pipeline

**Given** a valid cron request is received
**When** `RunDailyPipelineUseCase.execute()` runs
**Then** it calls `IngestNewsUseCase.execute()` and logs `[PIPELINE] ingest: X articles fetched, Y impacts stored`
**And** returns HTTP 200 with a JSON summary `{ articlesIngested: number, impactsStored: number }`

**Given** the pipeline throws an unhandled error
**When** the cron endpoint catches it
**Then** it logs `[PIPELINE] error: <message>` and returns HTTP 500 — the next cron invocation will retry

---

## Epic 1: Foundation — Project Infrastructure & Domain Setup

Establish the complete technical foundation: database schema, domain models, ports, fakes, shared infrastructure, and error handling patterns — enabling all subsequent epics to build on a solid, tested base.

### Story 1.1: Shared Infrastructure Setup (DB client, error handling, rate limiter)

As a developer,
I want the shared infrastructure layer (Drizzle DB client, ApiError class, rate limiter) set up and configured,
So that all future use cases and route handlers can rely on a consistent, tested foundation.

**Acceptance Criteria:**

**Given** the project is initialized with SvelteKit + TypeScript strict
**When** `src/lib/server/shared/db/client.ts` is created
**Then** it exports a singleton Drizzle instance connected via `DATABASE_URL` env var
**And** it never exposes the connection string to any client-side code

**Given** an infrastructure adapter catches an unknown error
**When** `createApiError(error)` is called
**Then** it returns an `ApiError` with status 500 and the original message preserved

**Given** a request hits any `/api/*` route
**When** the rate limit (60 req/min per IP) is exceeded
**Then** `hooks.server.ts` returns a 429 response without reaching the route handler

### Story 1.2: News Domain — News aggregate, NewsImpact value object, ImpactType enum, Sector enum

As a developer,
I want the `news` domain models (`News` aggregate, `NewsImpact` value object, `ImpactType` enum, `Sector` enum) defined with zero external imports,
So that the domain clearly represents that a single article can impact multiple sectors independently.

**Acceptance Criteria:**

**Given** `impact-type.ts` is imported
**When** the type is used
**Then** it exports `ImpactType` with values `STRUCTURAL` and `PUNCTUAL`

**Given** `sector.ts` is imported
**When** the Sector type is used
**Then** it covers at minimum 10 economic sectors: TECHNOLOGY, ENERGY, HEALTHCARE, FINANCIALS, CONSUMER, INDUSTRIALS, MATERIALS, UTILITIES, REAL_ESTATE, COMMUNICATION
**And** the file has zero imports outside the `domain/` folder

**Given** `news-impact.ts` defines the `NewsImpact` value object
**When** a `NewsImpact` is constructed
**Then** it contains: `id`, `newsId` (FK to News), `sector: Sector`, `impactScore: number` (range [-1, 1]), `impactType: ImpactType`

**Given** `news.ts` defines the `News` aggregate
**When** a `News` is constructed
**Then** it contains: `id`, `publishedAt`, `analyzedAt`, `source`, `headline`
**And** `News` does not directly contain sector/impactScore — those belong to `NewsImpact`

**Given** a unit test `news-impact.test.ts` exists
**When** vitest runs
**Then** it verifies that `impactScore` outside [-1, 1] is rejected and that an empty `headline` is rejected

### Story 1.3: News Infrastructure — DB schemas, repository port, Drizzle repository, fakes

As a developer,
I want the `news` and `news_impacts` DB schemas, repository port, Drizzle implementation, and fake defined,
So that the ingestion use case can persist a `News` with its N associated `NewsImpact` records, and tests can run without a real DB.

**Acceptance Criteria:**

**Given** `news-impact.schema.ts` defines the two Drizzle tables
**When** `drizzle-kit generate` is run
**Then** a migration is produced with:
- table `news`: `id`, `published_at`, `analyzed_at`, `source`, `headline`
- table `news_impacts`: `id`, `news_id` (FK → `news.id`), `sector`, `impact_score`, `impact_type`
**And** all columns are snake_case

**Given** `news-impact.repository.port.ts` defines the port
**When** imported from `contexts/news/application/`
**Then** it exposes at minimum:
- `save(news: News, impacts: NewsImpact[]): Promise<void>`
- `findAllImpacts(): Promise<NewsImpact[]>`

**Given** `DrizzleNewsImpactRepository` implements the port
**When** `save()` is called
**Then** the `News` and all its `NewsImpact` records are inserted in a single transaction
**And** no existing row is modified (append-only)
**And** snake_case → camelCase mapping is applied at the repository boundary

**Given** `FakeNewsImpactRepository` exists in `infrastructure/fakes/`
**When** used in unit tests
**Then** it satisfies the port interface with in-memory arrays, no DB required

### Story 1.4: Scoring Domain — SectorScore aggregate, DecayModel

As a developer,
I want the `scoring` domain models (SectorScore aggregate, DecayModel with λ constants) defined with zero external imports,
So that the scoring engine has a pure, testable mathematical foundation.

**Acceptance Criteria:**

**Given** `sector-score.ts` is imported
**When** a `SectorScore` object is constructed
**Then** it contains: `date: Date`, `sector: Sector`, `score: number` (unbounded)
**And** the file has zero imports outside `domain/`

**Given** `decay-model.ts` defines the decay function and λ constants
**When** `computeDecay(impactScore, impactType, ageInDays)` is called with a STRUCTURAL event
**Then** the result decays slower than the same call with a PUNCTUAL event (λ_STRUCTURAL < λ_PUNCTUAL)
**And** the formula used is `impactScore × e^(-λ × ageInDays)`

**Given** a unit test `decay-model.test.ts` exists
**When** vitest runs
**Then** it verifies: STRUCTURAL decay at day 7 > PUNCTUAL decay at day 7 for the same input score
**And** it verifies: decay at day 0 = impact score (no decay applied)

### Story 1.5: Scoring Infrastructure — DB schema, repository port, Drizzle repository, fakes

As a developer,
I want the `sector_scores` DB schema, repository port, Drizzle implementation, and fakes defined,
So that the scoring engine can persist and retrieve materialized score snapshots.

**Acceptance Criteria:**

**Given** `sector-score.schema.ts` defines the Drizzle table
**When** `drizzle-kit generate` is run
**Then** a migration is produced with table `sector_scores` and columns: `date`, `sector`, `score` — all snake_case

**Given** `sector-score.repository.port.ts` defines the port
**When** imported from `contexts/scoring/application/`
**Then** it exposes: `upsert(score: SectorScore): Promise<void>` and `findLatest(): Promise<SectorScore[]>`

**Given** `DrizzleSectorScoreRepository` implements the port
**When** `upsert()` is called for the same sector and date twice
**Then** the second call overwrites the first (no duplicate rows per sector+date)
**And** camelCase ↔ snake_case mapping is applied at the repository boundary

**Given** `FakeSectorScoreRepository` exists in `infrastructure/fakes/`
**When** used in unit tests
**Then** it satisfies the port interface with an in-memory map, no DB required

