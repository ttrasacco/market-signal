# CLAUDE.md

## Projet

Analyse quotidienne de news financières par IA. Ingestion → classification LLM → score par secteur économique avec décroissance temporelle → dashboard. Objectif : tendances sectorielles de moyen terme, pas de réactivité court terme.

---

## Stack

- SvelteKit + TypeScript strict
- PostgreSQL
- API Anthropic (claude-sonnet)
- Vitest + Playwright

---

## Architecture hexagonale + DDD

Règle absolue : **dépendances vers l'intérieur uniquement**. Le domain n'importe rien d'autre que lui-même.

```
src/lib/server/
├── contexts/
│   ├── news/
│   │   ├── domain/         news-impact.ts · impact-type.ts · sector.ts
│   │   ├── application/
│   │   │   ├── ports/      news-impact.repository.port.ts · news-classifier.port.ts
│   │   │   └── use-cases/  ingest-news.use-case.ts
│   │   └── infrastructure/
│   │       ├── db/         news-impact.repository.ts · news-impact.schema.ts
│   │       ├── llm/        anthropic-classifier.ts
│   │       └── fakes/      fake-news-impact.repository.ts · fake-news-classifier.ts
│   └── scoring/
│       ├── domain/         sector-score.ts · decay-model.ts
│       ├── application/
│       │   ├── ports/      sector-score.repository.port.ts · news-impact.read.port.ts
│       │   └── use-cases/  compute-daily-scores.use-case.ts
│       └── infrastructure/
│           ├── db/         sector-score.repository.ts · sector-score.schema.ts
│           └── fakes/      fake-sector-score.repository.ts
├── cross-context/
│   └── pipeline/
│       ├── application/    run-daily-pipeline.use-case.ts
│       └── interface/      cron-handler.ts
├── middleware/             rate-limiter.ts
├── decorators/             (post-MVP : retry, timing, circuit-breaker)
└── shared/
    └── db/                 client.ts (instance Drizzle partagée)

src/routes/                 ← couche Interface (câblage uniquement)
├── dashboard/              +page.svelte · +page.server.ts
└── api/
    ├── sector-scores/      +server.ts
    ├── news-impacts/       +server.ts (debug/ops)
    └── cron/daily/         +server.ts (Vercel Cron → CRON_SECRET)
```

**Règles de dépendance :**
- `contexts/*/domain/` — zéro import externe
- `contexts/*/application/` — importe uniquement son propre domaine
- `cross-context/*/application/` — seul endroit autorisé à importer plusieurs domaines
- `middleware/` et `decorators/` — n'importent rien de `contexts/`
- `src/routes/` — câblage uniquement, instancie les adapters et injecte dans les use cases

---

## Flux de données

```
[Cron quotidien] → [Fetch news RSS/API] → [LLM : secteur + score + type] → [news_impacts append-only]
→ [Job calcul : decay-model sur event store] → [sector_scores snapshot] → [Dashboard lecture directe]
```

---

## Modèle de données

**`news_impacts`** — event store append-only, jamais muté
`id · published_at · analyzed_at · source · headline · sector · impact_score · impact_type (STRUCTURAL|PUNCTUAL)`

**`sector_scores`** — read model matérialisé, recalculé quotidiennement
`date · sector · score`

**Formule de décroissance** : `Score(secteur, T) = Σ impact(newsᵢ) × e^(-λ × (T - tᵢ))`
- STRUCTURAL → λ faible (décroissance lente)
- PUNCTUAL → λ élevé (décroissance rapide)

---

## Profil développeur

- Débutant en tests — exemples toujours sur le code existant du projet
- Débutant Svelte/SvelteKit — analogies Angular bienvenues
- DDD/Hexagonale : notions théoriques — signaler explicitement toute violation d'architecture
- TypeScript NestJS/Angular confirmé

---

## Conventions

- Pas de `any`
- Fichiers : `kebab-case` — Classes/Interfaces : `PascalCase` — variables/fonctions : `camelCase`
- Commits : conventional commits (`feat:` `fix:` `refactor:` `test:`)