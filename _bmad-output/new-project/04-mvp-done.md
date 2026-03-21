# MVP — What's Already Built (SvelteKit v1)

These features are validated and working in production. They must be rebuilt in the Angular/NestJS v2.

## Features

### News ingestion pipeline
- Fetch from RSS/API sources daily via cron
- LLM classification via Anthropic (claude-sonnet):
  - sector assignment (1 news → N news_impacts, one per relevant sector)
  - `impact_score` in [-1, 1]
  - `impact_type` STRUCTURAL | PUNCTUAL

### Decay scoring computation
- Formula: `Score(sector, T) = Σ impact(newsᵢ) × e^(-λ × (T - tᵢ))`
- λ_STRUCTURAL = 0.05 (~14-day half-life)
- λ_PUNCTUAL = 0.3 (~2.3-day half-life)
- Runs daily, produces one `sector_score` row per sector

### Dashboard
- Sector score cards with current score + trending score
- Sector row layout with highlight indicators
- Reads `sector_scores` directly — no computation at query time

### API endpoints
- `GET /api/sector-scores` — latest sector scores
- `POST /api/cron/daily` — Vercel Cron trigger (CRON_SECRET protected)
- `GET /api/news-impacts` — debug/ops

### Infrastructure
- PostgreSQL (Neon serverless)
- Drizzle ORM
- Vercel deployment (serverless, max duration 300s)
- Rate limiter middleware

## Domain model (v1 — to extend in v2)

```typescript
// news_impacts table
{
  id:           uuid
  newsId:       uuid
  publishedAt:  timestamp
  analyzedAt:   timestamp
  source:       string
  headline:     string
  sector:       Sector
  impactScore:  float [-1, 1]
  impactType:   STRUCTURAL | PUNCTUAL
}

// sector_scores table
{
  date:          date
  sector:        Sector
  currentScore:  float
  trendingScore: float
  newsCount:     int
}
```

## Architecture (v1)

- Hexagonal architecture (ports & adapters)
- Dependency rule: inward only
- Fakes for all repositories and classifiers (no DB in tests)
- SvelteKit as full-stack framework (routes = interface layer)

## What to port — checklist

- [ ] Domain entities: `NewsImpact`, `SectorScore`, `ImpactType`, `Sector`
- [ ] Decay model: `computeDecay(score, type, ageInDays)`
- [ ] Port interfaces: `NewsClassifierPort`, `NewsImpactRepositoryPort`, `SectorScoreRepositoryPort`
- [ ] Use cases: `IngestNews`, `ComputeDailyScores`, `GetLatestSectorScores`
- [ ] DB schemas (Drizzle): `news_impacts`, `sector_scores`
- [ ] Anthropic classifier adapter
- [ ] Fakes for all ports
- [ ] Daily pipeline cron handler
- [ ] Dashboard UI (sector score cards, trend indicators)
