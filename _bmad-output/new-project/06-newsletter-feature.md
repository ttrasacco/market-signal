# Newsletter Feature

## Context

A rich weekly financial newsletter (e.g. "Marée noire") contains content that is fundamentally different from raw RSS feeds:

- **Already interpreted** by a human expert — the analysis is done, not just the facts
- **Multi-asset coverage** — stocks, commodities, macro, crypto in one document
- **Causal narratives** — explains *why* things moved, not just *that* they moved
- **Quantified data** — % variations already computed per asset

## LLM as 3-output sorter

The newsletter is not treated as "one more news source". The LLM decomposes it into 3 distinct output types:

```
Newsletter text
     ↓
[LLM decomposition]
     ├── [1] Fact news not in RSS      → news_impacts (PUNCTUAL)
     │         e.g. Trustpilot +34% after earnings beat
     │
     ├── [2] Sector structural signals → news_impacts (STRUCTURAL)
     │         e.g. "Equinor benefits from sustained gas price rise"
     │
     └── [3] Cross-sector macro context → macro_signals (direct injection)
               e.g. "Middle East conflict → energy disruption → inflation pressure"
               e.g. "Central banks constrained by energy prices"
```

## Prompt structure

The LLM receives the full newsletter text and must return a structured JSON with three sections:

```json
{
  "fact_news": [
    {
      "headline": "Trustpilot posts record annual profit",
      "sector": "Technology",
      "impact_score": 0.6,
      "impact_type": "PUNCTUAL",
      "confidence": 0.92,
      "country_codes": ["DK"],
      "regions": ["Europe"]
    }
  ],
  "structural_signals": [
    {
      "headline": "Equinor benefits from sustained LNG exposure amid Middle East conflict",
      "sector": "Energy",
      "impact_score": -0.7,
      "impact_type": "STRUCTURAL",
      "confidence": 0.88,
      "country_codes": ["NO", "IR", "QA"],
      "regions": ["Middle East", "Europe"]
    }
  ],
  "macro_signals": [
    {
      "title": "Middle East conflict disrupts Strait of Hormuz",
      "description": "Israeli strikes on South Pars + Ras Laffan damage. Strait of Hormuz paralyzed. Major supply shock for global energy.",
      "direction": "NEGATIVE",
      "intensity": 0.9,
      "sectors": ["Energy", "Industrials", "Consumer", "Financials"]
    },
    {
      "title": "Central banks constrained by energy-driven inflation",
      "description": "Fed likely on hold. ECB considering rate hike. Reduced monetary easing headroom.",
      "direction": "NEGATIVE",
      "intensity": 0.7,
      "sectors": ["Financials", "Real Estate", "Consumer"]
    }
  ]
}
```

## Confrontation newsletter ↔ sector_scores

The newsletter provides a human expert's view of the same period covered by the computed scores. This enables:

- **Confirmation**: newsletter agrees with score direction → higher confidence in the trend
- **Divergence**: newsletter contradicts the score → flag for review, potential miscalibration signal

This confrontation can be shown on the dashboard as a small indicator per sector: ✓ confirmed / ⚠ divergence.

## API

```
POST /api/newsletter/ingest
Content-Type: text/plain

[raw newsletter text]
```

Response:
```json
{
  "news_impacts_created": 12,
  "macro_signals_created": 3,
  "sectors_affected": ["Energy", "Financials", "Technology"]
}
```

## Source tagging

All `news_impacts` generated from the newsletter get `source = 'newsletter'`. This allows:
- Separate tracking in `source_quality`
- Filtering in the dashboard ("show only newsletter signals")
- Attribution in cluster analysis
