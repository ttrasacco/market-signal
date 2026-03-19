# market-signal

> Analyse quotidienne de news financières par IA pour détecter les tendances sectorielles de moyen terme.

**Live :** https://market-signal-seven.vercel.app/

---

## Ce que ça fait

market-signal ingère des news financières chaque jour, classifie chaque article via un LLM, et calcule un score par secteur économique qui évolue dans le temps. L'objectif n'est pas de réagir à l'actualité immédiate, mais de détecter des **tendances structurelles à moyen terme** en accumulant des signaux sur plusieurs jours/semaines.

Un secteur qui reçoit régulièrement des signaux positifs structurels verra son score progresser. Un événement ponctuel décroît naturellement sans laisser de trace durable.

---

## Comment ça marche

```
[Cron quotidien]
     ↓
[Récupération des news — RSS / APIs]
     ↓
[Classification LLM]                  ← secteur, score d'impact [-1, 1], type (structurel / ponctuel)
     ↓
[Stockage dans l'event store]         ← immuable, append-only
     ↓
[Calcul quotidien des scores]         ← modèle de décroissance exponentielle sur l'event store
     ↓
[Stockage du snapshot]                ← une ligne par secteur par jour
     ↓
[Dashboard]                           ← lecture directe des snapshots, zéro calcul à la volée
```

### Modèle de scoring par décroissance

Le score de chaque secteur est calculé comme une somme pondérée des impacts passés, où les signaux anciens perdent progressivement de l'influence :

```
Score(secteur, T) = Σ impact(newsᵢ) × e^(-λ × (T - tᵢ))
```

- Les news structurelles (changements réglementaires, restructurations, politiques long terme) décroissent lentement — `λ` faible
- Les news ponctuelles (résultats trimestriels, événements isolés) décroissent plus vite — `λ` élevé
- Plusieurs signaux du même type qui s'accumulent sur une courte période se renforcent naturellement avant de décroître

---

## Architecture

Le projet suit une **architecture hexagonale** (ports & adapters) avec les principes **DDD**, implémentée sur **SvelteKit** comme framework TypeScript full-stack.

```
src/
├── lib/
│   └── server/
│       ├── contexts/             ← bounded contexts isolés (news, scoring)
│       │   ├── news/
│       │   │   ├── domain/       ← entités, value objects
│       │   │   ├── application/  ← ports + use cases single-context
│       │   │   └── infrastructure/ ← adapters DB, LLM, fakes de test
│       │   └── scoring/
│       │       ├── domain/
│       │       ├── application/
│       │       └── infrastructure/
│       ├── cross-context/        ← orchestration multi-domaine (pipeline cron)
│       ├── middleware/           ← rate-limiter, logging
│       ├── decorators/           ← retry, circuit-breaker (post-MVP)
│       └── shared/               ← client DB partagé
└── routes/                       ← couche interface (pages et endpoints API SvelteKit)
    ├── dashboard/
    └── api/
        ├── sector-scores/
        ├── news-impacts/         ← debug/ops
        └── cron/daily/           ← déclenché par Vercel Cron
```

Règle de dépendance : **vers l'intérieur uniquement**. Le domaine n'a aucune connaissance de l'infrastructure ou de SvelteKit. `cross-context/` est le seul endroit autorisé à importer depuis plusieurs contextes.

Les données suivent le pattern **Event Sourcing + CQRS** :
- `news_impacts` — event store append-only, jamais muté
- `sector_scores` — read model matérialisé, recalculé chaque jour par un job planifié

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | SvelteKit |
| Langage | TypeScript (strict) |
| Base de données | PostgreSQL |
| LLM | API Anthropic (claude-sonnet) |
| Tests unitaires / intégration | Vitest |
| Tests E2E | Playwright |

---

## Démarrage

```bash
# Installer les dépendances
npm install

# Copier les variables d'environnement
cp .env.example .env

# Lancer le serveur de développement
npm run dev
```

### Variables d'environnement

```env
DATABASE_URL=postgresql://user:password@localhost:5432/market_signal
ANTHROPIC_API_KEY=your_api_key_here
```

---

## Statut du projet

🚧 En cours de développement
