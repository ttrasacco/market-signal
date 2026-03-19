---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
classification:
  projectType: web_app
  domain: fintech
  complexity: high
  projectContext: greenfield
inputDocuments: ['CLAUDE.md', 'README.md', 'README.fr.md']
workflowType: 'prd'
---

# Product Requirements Document - market-signal

**Author:** Thomas
**Date:** 2026-03-19

## Executive Summary

market-signal is a personal financial intelligence tool that ingests daily financial news, classifies each article via LLM, and computes a decay-weighted score per economic sector. The goal is not short-term reactivity but detection of medium-to-long-term structural trends — giving the user a macro view of sector health to inform investment decisions: where to allocate capital, and when to exit.

**Target user:** Individual investor (personal use). No multi-tenancy, no alerting, no social features.
**Classification:** Web app · Fintech · High complexity · Greenfield · Solo developer

### What Makes This Special

The core insight is the distinction between **structural** and **punctual** news events. A regulatory change carries lasting signal; a quarterly earnings beat does not. By applying differentiated exponential decay rates (low λ for structural, high λ for punctual), the scoring model filters noise and surfaces conviction-grade trends. A sector accumulating consistent structural positives over weeks shows a rising score — not because of yesterday's headline, but because of sustained directional pressure.

This is not a sentiment aggregator. It is a conviction signal.

## Success Criteria

### User Success

- Dashboard opens to an immediately readable sector health overview — no news reading required
- Score movements are directionally coherent with observable macro reality
- Investment allocation and exit decisions are informed by score trends, not individual headlines

### Technical Success

- Daily ingestion job runs autonomously without manual intervention
- LLM classification produces consistent, non-absurd sector/type assignments
- Decay model computes correct exponential weights per impact type (structural vs punctual)
- System accumulates sufficient data after ~30 days for scores to be meaningful

### Measurable Outcomes

- **Warm-up period:** ~30 days of daily ingestion before scores are exploitable
- **Dashboard load:** Sector scores readable at a glance, no calculation at runtime
- **Classification quality:** No obviously wrong sector assignments on manual spot-check

## Product Scope

### MVP (Phase 1)

- Daily cron: fetch financial news via RSS/API
- LLM classification: sector + impact score [-1, 1] + type (STRUCTURAL | PUNCTUAL)
- Append-only event store (`news_impacts`)
- Daily score computation with exponential decay model
- Materialized snapshot (`sector_scores`)
- Dashboard: visual sector score overview (~10 sectors), mobile-friendly, read-only
- Chrome only · no auth · no SEO · no warm-up indicator

### Phase 2 (Post-MVP)

- Per-sector detail page: LLM-generated narrative explaining why a sector is trending up or down
- Breaking news card gallery: horizontally scrollable, LLM-summarized flash news with sector tags — decoupled from the scoring pipeline, does not feed `news_impacts`
- RSS feed management UI: activate or ignore specific feeds from within the app
- User authentication (prerequisite for feed management)

### Phase 3 (Vision)

- Full multi-user SaaS with per-user personalized scoring
- Score history visualization (trend over time per sector)
- Native mobile app via Capacitor (App Store)
- Additional news sources for broader signal coverage

## User Journeys

### Journey 1 — Daily Sector Check (Primary, Happy Path)

Thomas opens the dashboard on a weekday morning — on desktop or mobile browser. The previous night's cron job has already run. He scans the sector overview: Technology is trending up steadily, Energy has been declining for two weeks. In 30 seconds, he has a macro read on where conviction is building and where it's fading. No news to read, no manual aggregation.

### Journey 2 — Trusting the Signal (Warm-up Period)

Thomas deploys the app. For the first two weeks, he sees scores but knows they're noise — insufficient history. Around day 35, the scores start feeling coherent with observable market reality. He begins trusting the signal. The product earns credibility through accumulation.

### Journey 3 — Ops Check (Maintenance)

Thomas notices dashboard scores haven't changed in 3 days. He checks server logs, finds the cron job failed silently, and restarts it manually. No data is lost — the event store is append-only.

### Journey 4 — Spot-checking Classification (Troubleshooting)

A major regulatory announcement hits Healthcare. Thomas sees no dashboard movement. He queries `news_impacts` directly, finds the article was classified as PUNCTUAL. No correction UI in MVP — known limitation.

### Journey Requirements Summary

| Capability | Journey |
|---|---|
| Sector score dashboard (read-only, mobile-friendly) | 1 |
| Daily cron + autonomous ingestion | 1, 3 |
| Append-only event store (no data loss on failure) | 3 |
| LLM classification (sector + type + score) | 4 |
| Direct DB inspection as ops fallback | 4 |

## Domain-Specific Requirements

Standard fintech compliance (PCI-DSS, KYC/AML) does not apply — no payments, no user financial data, no transactions.

- **API cost management:** Daily article volume must remain bounded; Anthropic API usage is per-classification
- **News source ToS:** RSS feeds and news APIs must be used within their respective terms of service
- **Secret management:** Anthropic API key and database credentials stored as server-only environment variables, never committed to version control

## Innovation & Novel Patterns

### Two-Tier Decay Model

The core innovation is asymmetric exponential decay applied to LLM-classified news: structural events decay slowly (low λ), punctual events decay rapidly (high λ). This maps investment intuition — "is this noise or does it change the thesis?" — onto a computable model. Most sentiment tools treat all signals uniformly; market-signal does not.

Combined with an append-only event store, all scores are fully reproducible: any historical score can be recomputed from raw events.

### Competitive Context

Bloomberg terminals, sentiment APIs, and news aggregators surface raw sentiment without temporal modeling or require manual curation. The structural/punctual distinction is a domain insight, not a technical novelty — but its systematic application to automated scoring is the differentiator.

### Validation & Risk

**Validation:** After 30-day warm-up, cross-check sector score trends against known macro events. Spot-check 10–20 LLM classifications per week for coherence.

**Risks:**
- **LLM misclassification:** Structural/punctual distinction depends on prompt quality — fallback is manual DB inspection
- **Signal sparsity:** Low news volume for a sector → artificially stable score; acceptable MVP limitation

## Web App Requirements

- **Rendering:** SPA with SSR on initial page load (SvelteKit default)
- **Browser support:** Chrome (latest) only
- **Responsive:** Mobile-friendly layout for dashboard readability on small screens
- **No real-time:** Scores computed once daily — no WebSocket, no polling
- **No auth in MVP:** Single user, personal deployment
- **No SEO:** No public indexing required
- **No PWA/service worker in MVP:** Mobile browser access only, no install prompt

## Functional Requirements

### News Ingestion

- FR1: The system fetches financial news articles from configured RSS feeds on a daily schedule
- FR2: The system stores raw ingested articles before classification
- FR3: The ingestion pipeline runs autonomously without manual intervention

### LLM Classification

- FR4: The system classifies each article with a target economic sector
- FR5: The system assigns each article an impact score between -1 and 1
- FR6: The system classifies each article as STRUCTURAL or PUNCTUAL impact type
- FR7: The system persists each classified article as an immutable event in the event store

### Sector Scoring

- FR8: The system computes a decay-weighted score for each sector from accumulated news impacts
- FR9: The system applies a low decay rate (λ) to STRUCTURAL events and a high decay rate to PUNCTUAL events
- FR10: The system produces a daily materialized score snapshot per sector
- FR11: The system can recompute historical scores from the event store at any point

### Dashboard

- FR12: The user can view all sector scores in a single overview
- FR13: The user can visually distinguish sectors trending positively from sectors trending negatively
- FR14: The user can access the dashboard from a mobile browser
- FR15: The dashboard serves pre-computed scores — no runtime calculation

### Observability & Ops

- FR16: The user can inspect raw classified events in the event store directly via DB
- FR17: The system logs cron job execution status (success/failure)

## Non-Functional Requirements

### Performance

- Dashboard initial load completes within 3 seconds on a standard broadband connection
- Sector scores served from pre-computed snapshots — zero query computation at request time
- Daily pipeline (ingestion + classification + scoring) completes within 30 minutes

### Security

- Anthropic API key and database credentials stored as server-side environment variables only — never client-exposed, never committed to version control
- RSS feed sources limited to public, authorized feeds

### Integration Resilience

- Anthropic API failure: log error, skip affected batch, do not crash the pipeline
- RSS feed unavailability: handle gracefully without blocking the full ingestion run
