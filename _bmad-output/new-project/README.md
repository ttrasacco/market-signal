# market-signal v2 — New Project Docs

Documentation complète pour repartir from scratch en Angular + NestJS.

## Fichiers

| Fichier | Contenu |
|---|---|
| [00-overview.md](./00-overview.md) | Vision produit, concepts clés, flux de données |
| [01-stack.md](./01-stack.md) | Stack technique complète avec rationale |
| [02-domain-model.md](./02-domain-model.md) | Toutes les tables, entités, enums, règles domaine |
| [03-architecture.md](./03-architecture.md) | Structure NestJS, modules, CQRS, DI |
| [04-mvp-done.md](./04-mvp-done.md) | Ce qui est déjà en prod — à porter en v2 |
| [05-roadmap.md](./05-roadmap.md) | Les 7 étapes post-MVP avec checklists |
| [06-newsletter-feature.md](./06-newsletter-feature.md) | Feature newsletter — détail complet |

## Par où commencer

1. Lire `00-overview.md` pour le contexte produit
2. Lire `01-stack.md` pour les choix techniques
3. Lire `03-architecture.md` pour la structure NestJS
4. Commencer par `04-mvp-done.md` — porter l'existant en premier
5. Suivre `05-roadmap.md` étape par étape

## Stack résumée

```
Frontend  : Angular
Backend   : NestJS + @nestjs/cqrs
Database  : PostgreSQL + pgvector (Neon serverless)
ORM       : Drizzle ORM
LLM       : Anthropic API (claude-sonnet)
Deploy    : Vercel
Tests     : Vitest (unit) + Playwright (E2E)
```
