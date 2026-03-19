---
name: testing-skill
description: Ce fichier est à utiliser quand on travaille sur des fichiers de test (tests unitaires, tests d'intégration, faux repositories, et tests E2E).
---

## Tests unitaires (Vitest) — fonctions pures du domaine

```typescript
// domain/scoring/decay-model.test.ts
import { describe, it, expect } from 'vitest';
import { computeDecayedScore } from './decay-model';

describe('computeDecayedScore', () => {
    it('retourne 0 si aucun impact', () => {
        expect(computeDecayedScore([], new Date(), 0.1)).toBe(0);
    });

    it("une news récente pèse plus lourd qu'une news ancienne", () => {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 86400000);
        const recent = computeDecayedScore([{ score: 1, publishedAt: now }], now, 0.1);
        const old = computeDecayedScore([{ score: 1, publishedAt: yesterday }], now, 0.1);
        expect(recent).toBeGreaterThan(old);
    });
});
```

---

## Tests d'intégration (Vitest) — use cases avec faux repositories

```typescript
// tests/fakes/in-memory-news-impact.repository.ts
export class InMemoryNewsImpactRepository implements NewsImpactRepositoryPort {
    public items: NewsImpact[] = [];
    async findAll() {
        return this.items;
    }
    async save(impact: NewsImpact) {
        this.items.push(impact);
    }
}
```

```typescript
// application/use-cases/ingest-news.use-case.test.ts
describe('IngestNewsUseCase', () => {
    let repo: InMemoryNewsImpactRepository;

    beforeEach(() => {
        repo = new InMemoryNewsImpactRepository();
    });

    it('stocke un impact après ingestion', async () => {
        await new IngestNewsUseCase(repo).execute({ headline: 'Test' });
        expect(repo.items).toHaveLength(1);
    });
});
```

---

## Tests E2E (Playwright)

```typescript
// tests/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('le dashboard affiche les secteurs', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('sector-row').first()).toBeVisible();
});
```

Ajouter `data-testid` sur les éléments ciblés par Playwright :

```svelte
<div data-testid="sector-row">{sector.name}</div>
```

---

## Commandes

```bash
npm run test            # unitaires + intégration
npm run test -- --watch # mode watch
npm run test:e2e        # E2E Playwright
```

---

## Ce qu'on ne teste pas

- Routes SvelteKit (`+server.ts`, `+page.server.ts`) — couvertes par les E2E
- Composants Svelte d'affichage pur — couverts par les E2E
