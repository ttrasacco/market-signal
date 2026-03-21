# market-signal v2 — Project Overview

## What it does

market-signal ingests financial news daily, classifies each article using an LLM, and computes a score per economic sector that evolves over time.

**Goal:** Detect structural, mid-term trends — not react to breaking news. A sector that consistently receives positive structural signals sees its score rise progressively. A one-off event decays naturally and leaves no lasting trace.

## Core concepts

### Decay scoring model

```
Score(sector, T) = Σ impact(newsᵢ) × e^(-λ × (T - tᵢ))
```

- **STRUCTURAL** news (regulation changes, geopolitical shifts, long-term policy) → λ = 0.05 (~14-day half-life)
- **PUNCTUAL** news (earnings, one-off events) → λ = 0.3 (~2.3-day half-life)

### Data flow

```
[Daily cron]
     ↓
[News fetch — RSS feeds]
     ↓
[LLM classification] → sector(s), impact_score [-1,1], impact_type, confidence, geo_scope
     ↓
[Append to event store] ← immutable, append-only (news_impacts)
     ↓
[Daily score computation] ← decay model on event store
     ↓
[Snapshot stored] ← sector_scores (one row per sector per day)
     ↓
[Dashboard] ← reads snapshots + macro_signals directly
```

### Economic sectors (10)

Technology · Energy · Healthcare · Financials · Consumer · Industrials · Materials · Utilities · Real Estate · Communication

## Architecture principles

- **Hexagonal architecture** (ports & adapters) — dependencies point inward only
- **DDD** — bounded contexts: News, Scoring, Embeddings, SourceQuality, MacroSignals, Newsletter
- **Event Sourcing + CQRS** — `news_impacts` is append-only event store, `sector_scores` is materialized read model
- **NestJS CQRS module** — Commands, Queries, Events, EventBus
