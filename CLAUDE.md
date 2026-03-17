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
├── domain/
│   ├── news/           news-impact.ts · impact-type.ts · sector.ts
│   ├── scoring/        sector-score.ts · decay-model.ts
│   └── ports/          news-impact.repository.port.ts · sector-score.repository.port.ts · news-classifier.port.ts
├── application/
│   └── use-cases/      ingest-news · compute-daily-scores · get-sector-dashboard
└── infrastructure/
    ├── db/             news-impact.repository.ts · sector-score.repository.ts
    └── llm/            anthropic-classifier.ts

src/routes/             ← couche Interface (câblage uniquement)
├── api/news/+server.ts
├── api/scores/+server.ts
└── dashboard/+page.svelte · +page.server.ts
```

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