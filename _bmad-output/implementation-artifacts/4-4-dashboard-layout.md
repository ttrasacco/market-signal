# Story 4.4: Dashboard Layout — Highlights Zone + Full Sector Table + page.server.ts

Status: review

## Story

As a user,
I want the dashboard to show a highlights zone (top 3 bullish + bottom 3 bearish) above a full sector table ordered by score, with low-reliability sectors deprioritized,
so that I get an immediate directional read at the top, and full context below.

> **Visual reference:** Open `_bmad-output/planning-artifacts/ux-design-directions.html` in a browser before starting. Every layout detail — highlights zone structure, sector table ordering, divider, topbar, empty state, mobile/desktop responsive behavior — is defined there.

## Acceptance Criteria

1. **Given** the dashboard loads via `+page.server.ts`
   **When** `GetSectorDashboardUseCase.execute()` returns scores
   **Then** SSR delivers pre-computed data — no client-side fetch, zero runtime calculation

2. **Given** sectors with score > 0 and green/orange reliability exist
   **When** the highlights zone renders
   **Then** the top 3 bullish sectors (highest score, reliable only — green or orange reliability icon) appear in the bullish section
   **And** the bottom 3 bearish sectors (lowest score < 0, reliable only) appear in the bearish section
   **And** each highlight card shows: sector name, Ripple Cast visual, narrative label

3. **Given** no sector has score > 0 or all qualifying sectors have red reliability
   **When** the highlights zone renders
   **Then** a contextual empty state message appears (e.g. "No significant sectoral pressure detected")

4. **Given** the full sector table renders below the highlights zone
   **When** sectors are ordered
   **Then** they are sorted by descending score
   **And** red-reliability sectors appear at the bottom with dimmed opacity (e.g. `opacity: 0.5`)
   **And** a 32px gap + `--color-border` horizontal rule visually separates highlights from the table

5. **Given** the page is viewed on mobile
   **When** the layout renders
   **Then** single-column card grid, page max-width 640px centered, card gap 12px

6. **Given** all text/background combinations are rendered
   **When** checked against WCAG AA
   **Then** all combinations meet ≥ 4.5:1 contrast ratio
   **And** signal colors are never the sole differentiator (always paired with position or label text)

## Tasks / Subtasks

- [x] Task 1 — Implement `+page.server.ts` load function (AC: #1)
  - [x] Wire `DrizzleSectorScoreRepository` + `DrizzleNewsImpactRepository` (for reliability)
  - [x] Instantiate `GetSectorDashboardUseCase` and call `execute()`
  - [x] Compute `ReliabilityData` per sector from `news_impacts` data (see Dev Notes §3)
  - [x] Return typed `PageData` with `sectors: SectorScoreWithReliability[]`

- [x] Task 2 — Implement `DashboardLayout.svelte` component (AC: #2, #3, #4, #5)
  - [x] Create `src/lib/components/dashboard-layout/DashboardLayout.svelte`
  - [x] Highlights zone: bullish section (top 3 reliable score > 0) + bearish section (bottom 3 reliable score < 0)
  - [x] Empty state when no qualifying sectors
  - [x] Full sector table below: descending score order, red-reliability sectors at bottom + dimmed
  - [x] Horizontal rule divider (32px gap + `--color-border`)
  - [x] Mobile: single-column, max-width 640px, card gap 12px

- [x] Task 3 — Wire layout into `+page.svelte` (AC: #1, #2)
  - [x] Update `src/routes/dashboard/+page.svelte` (currently empty — 1 line)
  - [x] Import `DashboardLayout` and pass page data as props
  - [x] Use `SectorScoreCard` with `reliabilityData` for each card in both zones

- [x] Task 4 — Implement reliability data computation helper (AC: #2, #4)
  - [x] Create `src/lib/components/dashboard-layout/dashboard-layout.utils.ts`
  - [x] `computeReliabilityDataPerSector(impacts: NewsImpactForReliability[]): Map<string, ReliabilityData>`
  - [x] Group impacts by sector; compute totalArticles, recentArticles (last 7d), sourceCount (distinct sources), punctualProportion
  - [x] Export `getBullishHighlights` / `getBearishHighlights` — top 3 bullish + bottom 3 bearish (reliable only)
  - [x] Export `sortForTable` — descending score, red-reliability at bottom

- [x] Task 5 — Unit tests for pure layout logic (no DOM)
  - [x] Test `getBullishHighlights`: top 3 bullish, excludes red-reliability, score > 0 only
  - [x] Test `getBearishHighlights`: bottom 3 bearish, excludes red-reliability, score < 0 only
  - [x] Test `sortForTable`: correct order, red at bottom
  - [x] Test edge cases: empty sector list, all red-reliability, fewer than 3 qualifying sectors
  - [x] Test `computeReliabilityDataPerSector`: totalArticles, recentArticles, sourceCount, punctualProportion
  - [x] Test `defaultReliabilityData`: zero-filled output

## Dev Notes

### 1. File locations — what exists vs what to create

| File | Status | Action |
|---|---|---|
| `src/routes/dashboard/+page.server.ts` | EXISTS (empty — 1 line) | IMPLEMENT load() function |
| `src/routes/dashboard/+page.svelte` | EXISTS (empty — 1 line) | IMPLEMENT with DashboardLayout |
| `src/lib/components/dashboard-layout/DashboardLayout.svelte` | CREATE | Main layout component |
| `src/lib/components/dashboard-layout/dashboard-layout.utils.ts` | CREATE | Pure filtering/sorting logic |
| `src/lib/components/dashboard-layout/dashboard-layout.utils.test.ts` | CREATE | Unit tests |

**IMPORTANT:** Components live in subfolders (`sector-score-card/`, `reliability-indicator/`). Follow the same pattern for `dashboard-layout/`.

### 2. `+page.server.ts` wiring — how to instantiate use case

```typescript
// src/routes/dashboard/+page.server.ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/shared/db/client';
import { DrizzleSectorScoreRepository } from '$lib/server/contexts/scoring/infrastructure/db/sector-score.repository';
import { DrizzleNewsImpactRepository } from '$lib/server/contexts/news/infrastructure/db/news-impact.repository';
import { GetSectorDashboardUseCase } from '$lib/server/contexts/scoring/application/use-cases/get-sector-dashboard.use-case';
import { computeReliabilityDataPerSector } from '$lib/components/dashboard-layout/dashboard-layout.utils';

export const load: PageServerLoad = async () => {
  const sectorScoreRepo = new DrizzleSectorScoreRepository();
  const newsImpactRepo = new DrizzleNewsImpactRepository();

  const useCase = new GetSectorDashboardUseCase(sectorScoreRepo);
  const [scores, allImpacts] = await Promise.all([
    useCase.execute(),
    newsImpactRepo.findAllImpacts()
  ]);

  const reliabilityMap = computeReliabilityDataPerSector(allImpacts);

  return {
    sectors: scores.map(s => ({
      ...s,
      reliabilityData: reliabilityMap.get(s.sector) ?? defaultReliabilityData()
    }))
  };
};
```

**Dependency direction:** `+page.server.ts` is the wiring layer (route) — it IS allowed to import from both `$lib/server/` (infrastructure) and `$lib/components/` (utils). No architecture violation.

**DO NOT** import `$lib/components/` from server-side domain or infrastructure code.

### 3. `ReliabilityData` computation — critical details

`ReliabilityData` requires:
- `totalArticles` — count of all `NewsImpact` records for this sector
- `recentArticles` — count of impacts with `publishedAt` within last 7 days
- `sourceCount` — count of **distinct sources** for this sector
- `punctualProportion` — ratio of PUNCTUAL impacts / total impacts (0–1)

**CRITICAL:** The `news_impacts` table does NOT store `publishedAt` or `source` — these are on the `news` table. The existing `findAllImpacts()` on the `NewsImpactReadPort` (scoring context read port) returns `NewsImpactForScoring` which includes `publishedAt` but NOT `source`.

You need source data for `sourceCount`. Two options:
- **Option A (recommended):** Use `DrizzleNewsImpactRepository.findAllImpacts()` from the **news context** — check if it returns source. If not, add `findAllImpactsWithSource()` to the news repo port.
- **Option B:** Write a raw Drizzle query joining `news_impacts` + `news` in `+page.server.ts` directly.

Check `src/lib/server/contexts/news/infrastructure/db/news-impact.repository.ts` to see what `findAllImpacts()` returns. If source is not available, add it with minimal change.

**Default when no impacts for a sector:**
```typescript
function defaultReliabilityData(): ReliabilityData {
  return { totalArticles: 0, recentArticles: 0, sourceCount: 0, punctualProportion: 0 };
}
```
This will produce a red reliability icon — correct behavior for sectors with no data.

### 4. Filtering and sorting logic

```typescript
import { computeReliabilityColor } from '$lib/components/reliability-indicator/reliability-indicator.utils';
import type { ReliabilityData } from '$lib/components/reliability-indicator/reliability-indicator.utils';

export type SectorScoreWithReliability = SectorScoreCardData & { reliabilityData: ReliabilityData };

// Top 3 bullish: score > 0, reliable (green or orange), highest first
export function getBullishHighlights(sectors: SectorScoreWithReliability[]): SectorScoreWithReliability[] {
  return sectors
    .filter(s => s.score > 0 && computeReliabilityColor(s.reliabilityData) !== 'red')
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// Bottom 3 bearish: score < 0, reliable (green or orange), lowest first
export function getBearishHighlights(sectors: SectorScoreWithReliability[]): SectorScoreWithReliability[] {
  return sectors
    .filter(s => s.score < 0 && computeReliabilityColor(s.reliabilityData) !== 'red')
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
}

// Full table: descending score, red-reliability sectors at bottom
export function sortForTable(sectors: SectorScoreWithReliability[]): SectorScoreWithReliability[] {
  const reliable = sectors
    .filter(s => computeReliabilityColor(s.reliabilityData) !== 'red')
    .sort((a, b) => b.score - a.score);
  const unreliable = sectors
    .filter(s => computeReliabilityColor(s.reliabilityData) === 'red')
    .sort((a, b) => b.score - a.score);
  return [...reliable, ...unreliable];
}
```

**Import rule:** `dashboard-layout.utils.ts` imports from `../reliability-indicator/reliability-indicator.utils` and `../sector-score-card/sector-score-card.utils` — both are `$lib/components/` files. No server imports allowed.

### 5. `DashboardLayout.svelte` structure

Use Svelte 5 runes (`$props`, `$derived`). Pattern from previous stories:

```svelte
<script lang="ts">
  import type { SectorScoreWithReliability } from './dashboard-layout.utils';
  import { getBullishHighlights, getBearishHighlights, sortForTable } from './dashboard-layout.utils';
  import SectorScoreCard from '../sector-score-card/SectorScoreCard.svelte';

  let { sectors }: { sectors: SectorScoreWithReliability[] } = $props();

  const bullish = $derived(getBullishHighlights(sectors));
  const bearish = $derived(getBearishHighlights(sectors));
  const tableRows = $derived(sortForTable(sectors));
  const hasHighlights = $derived(bullish.length > 0 || bearish.length > 0);
</script>
```

**Layout skeleton:**
```html
<main class="dashboard">
  <!-- Topbar (optional, per HTML mockup) -->

  <!-- Highlights zone -->
  <section class="highlights">
    {#if hasHighlights}
      {#if bullish.length > 0}
        <div class="highlight-group">
          <h2 class="type-section-heading">Bullish</h2>
          <div class="card-grid">
            {#each bullish as sector}
              <SectorScoreCard data={sector} reliabilityData={sector.reliabilityData} />
            {/each}
          </div>
        </div>
      {/if}
      <!-- same for bearish -->
    {:else}
      <p class="empty-state">No significant sectoral pressure detected</p>
    {/if}
  </section>

  <!-- Divider -->
  <div class="divider"></div>

  <!-- Full sector table -->
  <section class="sector-table">
    <div class="card-grid">
      {#each tableRows as sector}
        <div class:dimmed={computeReliabilityColor(sector.reliabilityData) === 'red'}>
          <SectorScoreCard data={sector} reliabilityData={sector.reliabilityData} />
        </div>
      {/each}
    </div>
  </section>
</main>
```

**CSS tokens to use:**
```css
.dashboard {
  max-width: 640px;
  margin: 0 auto;
  padding: 16px;
}
.card-grid {
  display: grid;
  gap: 12px;
}
.divider {
  margin: 32px 0;
  border-bottom: 1px solid var(--color-border);
}
.dimmed {
  opacity: 0.5;
}
.type-section-heading {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}
```

### 6. `+page.svelte` — wire in the layout

```svelte
<script lang="ts">
  import type { PageData } from './$types';
  import DashboardLayout from '$lib/components/dashboard-layout/DashboardLayout.svelte';

  let { data }: { data: PageData } = $props();
</script>

<DashboardLayout sectors={data.sectors} />
```

Both `+page.svelte` and `+page.server.ts` are currently empty (1 line each). This is the first meaningful code going into them.

### 7. Svelte 5 runes — mandatory

- Use `$props()`, `$derived()`, `$state()` — NOT `export let` (Svelte 4)
- See `SectorScoreCard.svelte` and `ReliabilityIndicator.svelte` for established patterns

### 8. Type definitions — reuse existing types

```typescript
import type { SectorScoreCardData } from '$lib/components/sector-score-card/sector-score-card.utils';
import type { ReliabilityData } from '$lib/components/reliability-indicator/reliability-indicator.utils';

// Do NOT import from $lib/server/ in component files
// SectorScore domain type: only use in +page.server.ts and utils therein
```

### 9. `DrizzleNewsImpactRepository.findAllImpacts()` — check for source field

Before implementing, read `src/lib/server/contexts/news/infrastructure/db/news-impact.repository.ts`. The `news_impacts` table has no `source` column — source is on `news`. The existing `findAllImpacts()` might or might not join with `news` to get `source`.

If source is missing, add a join or new method. Minimally invasive approach:
- Extend `NewsImpactForScoring` (or create a new type `NewsImpactForReliability`) with `source: string`
- Add `findAllImpactsWithSource(): Promise<(NewsImpactForScoring & { source: string })[]>` to the repository
- Use this in `+page.server.ts` only (no architecture violation — route layer)

**Do NOT modify the scoring context's `NewsImpactReadPort`** — that port is owned by the scoring context and used in `ComputeDailyScoresUseCase`. Adding source there would pollute a scoring-domain port with news-context data.

### 10. Anti-patterns to avoid

- **DO NOT** import `$lib/server/` from `.svelte` components or `dashboard-layout.utils.ts`
- **DO NOT** put filtering/sorting logic in `+page.svelte` — belongs in `dashboard-layout.utils.ts`
- **DO NOT** put Drizzle queries in `DashboardLayout.svelte`
- **DO NOT** use `export let` — use `$props()`
- **DO NOT** add client-side fetching — all data comes from `+page.server.ts` load function
- **DO NOT** compute reliability data in the Svelte component — compute it in `+page.server.ts`

### 11. Empty `+page.svelte` and `+page.server.ts`

Both files currently have 1 line (empty). No existing logic to preserve. This story writes the first real content into both files.

### 12. Testing approach — pure functions only

Test `dashboard-layout.utils.ts` with vitest, no DOM:

```typescript
import { getBullishHighlights, getBearishHighlights, sortForTable } from './dashboard-layout.utils';

const makeReliable = (sector: string, score: number) => ({
  sector, score, punctualScore: score, structuralScore: 0,
  reliabilityData: { totalArticles: 25, recentArticles: 8, sourceCount: 5, punctualProportion: 0.2 }
});
const makeUnreliable = (sector: string, score: number) => ({
  ...makeReliable(sector, score),
  reliabilityData: { totalArticles: 2, recentArticles: 0, sourceCount: 1, punctualProportion: 0 }
});
```

Test cases:
- `getBullishHighlights`: returns top 3, score > 0, excludes red-reliability
- `getBearishHighlights`: returns bottom 3, score < 0, excludes red-reliability
- `sortForTable`: reliable sectors before unreliable, within each group sorted by descending score
- Edge: all red-reliability → highlights empty, table shows all dimmed
- Edge: fewer than 3 qualifying → returns what's available (no padding)

### References

- [Source: epics.md — Story 4.4] — Acceptance criteria, filter thresholds, layout structure
- [Source: ux-design-specification.md — Dashboard Layout Decisions] — Top 3 / Bottom 3, score thresholds, empty state
- [Source: ux-design-specification.md — Reliability System] — Red = excluded from highlights, relegated to bottom of table
- [Source: architecture.md — Frontend Architecture] — SSR only, no client-side fetch, `+page.server.ts` load function pattern
- [Source: architecture.md — Project Structure] — `src/lib/components/dashboard-layout/`, route wiring in `src/routes/`
- [Source: 4-3-reliability-indicator.md — Dev Notes §7] — CSS tokens, Tailwind v4 naming convention
- [Source: 4-2-sector-score-card-component.md] — `SectorScoreCardData` type, `SectorScoreCard` import path
- [Source: CLAUDE.md] — TypeScript strict, no `any`, Svelte 5 runes

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Implémenté `dashboard-layout.utils.ts` avec `computeReliabilityDataPerSector`, `getBullishHighlights`, `getBearishHighlights`, `sortForTable`, `defaultReliabilityData`
- Ajouté `NewsImpactWithSource` type + `findAllImpactsWithSource()` sur `DrizzleNewsImpactRepository` (JOIN news + news_impacts), sans modifier le port ni le fake
- Implémenté `+page.server.ts` : SSR pur, zéro client-side fetch, wire use case + reliability computation
- Créé `DashboardLayout.svelte` avec highlights zone (bullish/bearish), empty state, divider, full sector table avec dimming des red-reliability
- Wired `+page.svelte` en 6 lignes — câblage uniquement
- 20 tests unitaires pour les fonctions pures (aucun DOM), 122 tests total — 0 régression

### File List

- `src/lib/components/dashboard-layout/dashboard-layout.utils.ts` (créé)
- `src/lib/components/dashboard-layout/dashboard-layout.utils.test.ts` (créé)
- `src/lib/components/dashboard-layout/DashboardLayout.svelte` (créé)
- `src/routes/dashboard/+page.server.ts` (implémenté)
- `src/routes/dashboard/+page.svelte` (implémenté)
- `src/lib/server/contexts/news/infrastructure/db/news-impact.repository.ts` (ajout `NewsImpactWithSource` + `findAllImpactsWithSource()`)

## Change Log

- 2026-03-19: Story created — ready-for-dev
- 2026-03-19: Implementation complete — moved to review
