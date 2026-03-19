# market-signal

> AI-powered financial news analysis to detect mid-term sector trends using event sourcing and decay scoring.

**Live:** https://market-signal-seven.vercel.app/

---

## What it does

market-signal ingests financial news daily, classifies each article using an LLM, and computes a score per economic sector that evolves over time. The goal is not to react to breaking news — markets already price that in milliseconds — but to detect **structural, mid-term trends** by accumulating signals over days and weeks.

A sector that consistently receives positive structural signals will see its score rise progressively. A one-off event decays naturally and leaves no lasting trace.

---

## How it works

```
[Daily cron]
     ↓
[News fetch — RSS / APIs]
     ↓
[LLM classification]                  ← sector, impact score [-1, 1], type (structural / punctual)
     ↓
[Append to event store]               ← immutable, append-only
     ↓
[Daily score computation]             ← exponential decay model applied to event store
     ↓
[Snapshot stored]                     ← one row per sector per day
     ↓
[Dashboard]                           ← reads snapshots directly, no computation at query time
```

### Decay scoring model

Each sector score is computed as a weighted sum of past impacts, where older signals lose influence over time:

```
Score(sector, T) = Σ impact(newsᵢ) × e^(-λ × (T - tᵢ))
```

- Structural news (regulation changes, supply chain shifts, long-term policy) decay slowly — low `λ`
- Punctual news (earnings, one-off events) decay faster — high `λ`
- Multiple signals of the same type accumulating in a short period reinforce each other naturally before decaying

---

## Architecture

The project follows **hexagonal architecture** (ports & adapters) with **DDD** principles, implemented on top of **SvelteKit** as a full-stack TypeScript framework.

```
src/
├── lib/
│   └── server/
│       ├── domain/           ← entities, value objects, domain services, port interfaces
│       ├── application/      ← use cases (ingest, compute, query)
│       └── infrastructure/   ← DB adapters, Anthropic LLM adapter
└── routes/                   ← interface layer (SvelteKit pages and API endpoints)
```

Dependency rule: **inward only**. Domain has zero knowledge of infrastructure or SvelteKit.

Data follows **Event Sourcing + CQRS**:

- `news_impacts` — append-only event store, never mutated
- `sector_scores` — materialized read model, recomputed daily by a scheduled job

---

## Tech stack

| Layer                    | Technology                    |
| ------------------------ | ----------------------------- |
| Framework                | SvelteKit                     |
| Language                 | TypeScript (strict)           |
| Database                 | PostgreSQL                    |
| LLM                      | Anthropic API (claude-sonnet) |
| Unit / integration tests | Vitest                        |
| E2E tests                | Playwright                    |

---

## Getting started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

### Environment variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/market_signal
ANTHROPIC_API_KEY=your_api_key_here
```

---

## Project status

Done
