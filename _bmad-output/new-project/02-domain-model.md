# Domain Model

## Tables

### `news` — raw ingested articles
```
id            uuid PK
published_at  timestamp
source        string          ← RSS feed identifier
headline      string
url           string
full_text     text (nullable) ← fetched when confidence is low
```

### `news_impacts` — event store (append-only, never mutated)
```
id              uuid PK
news_id         uuid FK → news.id
published_at    timestamp
analyzed_at     timestamp
sector          Sector
impact_score    float [-1, 1]
impact_type     ImpactType (STRUCTURAL | PUNCTUAL)
confidence      float [0, 1]    ← NEW: LLM classification confidence
geographic_scope  GeoScope (LOCAL | REGIONAL | GLOBAL)  ← NEW
country_codes   string[]        ← NEW: ['FR', 'US', 'IR'...]
regions         string[]        ← NEW: ['Middle East', 'Europe'...]
embedding       vector(1536)    ← NEW: semantic embedding (pgvector)
cluster_id      uuid (nullable) ← NEW: assigned cluster
```

**Note:** one `news` can produce N `news_impacts` (one per relevant sector).

### `sector_scores` — materialized read model (recomputed daily)
```
date            date
sector          Sector
current_score   float
trending_score  float
news_count      int
```

### `macro_signals` — cross-sector structural signals (NEW)
```
id              uuid PK
computed_at     timestamp
title           string
description     text
direction       POSITIVE | NEGATIVE | NEUTRAL
intensity       float [0, 1]
sectors         Sector[]         ← multiple sectors impacted
cluster_ids     uuid[]           ← source clusters
source          NEWSLETTER | EMERGENT
valid_until     timestamp (nullable)
```

### `source_quality` — computed weekly (NEW)
```
source              string PK    ← RSS feed identifier
avg_confidence      float        ← average classification confidence
correction_rate     float        ← % of articles reclassified after full fetch
signal_rate         float        ← % of articles with |score| > 0.1
sector_coverage     jsonb        ← { "Technology": 0.4, "Energy": 0.3, ... }
last_computed_at    timestamp
```

## Enums

### `ImpactType`
```typescript
enum ImpactType {
  STRUCTURAL = 'STRUCTURAL',  // λ = 0.05, ~14-day half-life
  PUNCTUAL   = 'PUNCTUAL'     // λ = 0.3,  ~2.3-day half-life
}
```

### `Sector`
```typescript
const Sector = {
  TECHNOLOGY:    'Technology',
  ENERGY:        'Energy',
  HEALTHCARE:    'Healthcare',
  FINANCIALS:    'Financials',
  CONSUMER:      'Consumer',
  INDUSTRIALS:   'Industrials',
  MATERIALS:     'Materials',
  UTILITIES:     'Utilities',
  REAL_ESTATE:   'Real Estate',
  COMMUNICATION: 'Communication'
}
```

## Decay model

```typescript
const LAMBDA_STRUCTURAL = 0.05;  // slow decay
const LAMBDA_PUNCTUAL   = 0.3;   // fast decay

function computeDecay(impactScore: number, impactType: ImpactType, ageInDays: number): number {
  const lambda = impactType === ImpactType.STRUCTURAL ? LAMBDA_STRUCTURAL : LAMBDA_PUNCTUAL;
  return impactScore * Math.exp(-lambda * ageInDays);
}
```

## Key domain rules

- `news_impacts` is **append-only** — never updated, never deleted
- A `news_impact` with residual weight `e^(-λ × age) < 0.05` is considered expired
- Cluster contradiction: new STRUCTURAL impact in same cluster with opposite sign → triggers recalculation of affected `sector_scores`
- `source_quality.signal_rate` acts as a multiplier on `impact_score` in decay computation
