# Story 4.3: Reliability Indicator — Multi-Criteria Icon + Desktop Dropdown

Status: review

## Story

As a user,
I want each sector card to display a reliability icon whose color reflects the worst of 4 data-quality criteria, with a desktop dropdown listing each criterion individually,
so that I can instantly assess how much to trust a sector score without reading documentation.

## Acceptance Criteria

1. **Given** a sector has `NewsImpact` metadata (total count, recent count, source count, PUNCTUAL proportion)
   **When** the reliability icon renders
   **Then** its color = worst of the 4 criteria (red if any criterion is red, else orange if any is orange, else green)
   **And** the 4 criteria thresholds are applied:
   - **Total articles:** < 5 → red, 5–20 → orange, > 20 → green
   - **Recent 7-day articles:** < 2 → red, 2–5 → orange, > 5 → green
   - **Source diversity:** 1 → red, 2–3 → orange, > 3 → green
   - **PUNCTUAL proportion:** > 70% → red, 35–70% → orange, < 35% → green

2. **Given** the user clicks or hovers the reliability icon on desktop
   **When** the dropdown opens
   **Then** all 4 criteria are listed with their individual colors
   **And** the dropdown background uses `--color-surface-elevated` (`#242429`)
   **And** it is keyboard accessible (focus, Enter/Space to open, Escape to close)

3. **Given** the viewport is mobile (≤ 480px)
   **When** the reliability icon renders
   **Then** only the icon color is shown — no dropdown, no tooltip

## Tasks / Subtasks

- [x] Task 1 — Define `ReliabilityData` type and pure computation logic (AC: #1)
  - [x] Create `src/lib/components/reliability-indicator.utils.ts`
  - [x] Define `ReliabilityData` type (4 numeric fields)
  - [x] Implement `criterionColor(value, thresholds)` pure function
  - [x] Implement `computeReliabilityColor(data: ReliabilityData): SignalColor` — worst-of-4
  - [x] Implement `computeAllCriteria(data: ReliabilityData): CriterionResult[]` — all 4 with individual colors

- [x] Task 2 — Implement `ReliabilityIndicator.svelte` component (AC: #1, #2, #3)
  - [x] Create `src/lib/components/ReliabilityIndicator.svelte`
  - [x] Icon: colored circle or shield-like shape matching `SignalColor`
  - [x] Desktop: click/hover toggle dropdown listing 4 criteria with individual colors
  - [x] Dropdown background: `--color-surface-elevated` (`#242429`)
  - [x] Mobile: icon color only, no dropdown (hide via CSS media query ≤480px)

- [x] Task 3 — Keyboard accessibility (AC: #2)
  - [x] Focus-able element (button or role="button")
  - [x] Enter/Space to open dropdown
  - [x] Escape to close dropdown
  - [x] Proper `aria-expanded`, `aria-haspopup` attributes

- [x] Task 4 — Wire `ReliabilityIndicator` into `SectorScoreCard` (AC: #1)
  - [x] Replace the `<div></div>` placeholder in `SectorScoreCard.svelte` with `<ReliabilityIndicator data={reliabilityData} />`
  - [x] Pass `ReliabilityData` prop through `SectorScoreCardData` or as a separate prop

- [x] Task 5 — Unit tests for pure logic (no DOM)
  - [x] Create `src/lib/components/reliability-indicator.utils.test.ts`
  - [x] Test `criterionColor` for each criterion at boundary values
  - [x] Test `computeReliabilityColor`: worst-of-4 logic (red wins, then orange, then green)
  - [x] Test `computeAllCriteria`: verify all 4 labels and colors returned correctly

## Dev Notes

### 1. `ReliabilityData` type — what to compute from existing data

Story 4.4 (Dashboard Layout) will pass this data from `+page.server.ts`. For this story, define the type and implement the component — the data shape is agreed:

```typescript
// In src/lib/components/reliability-indicator.utils.ts
export interface ReliabilityData {
  totalArticles: number;       // Total NewsImpact count for this sector
  recentArticles: number;      // NewsImpact count with published_at within last 7 days
  sourceCount: number;         // Distinct source count
  punctualProportion: number;  // Ratio: PUNCTUAL impacts / total impacts (0–1)
}
```

**For now**, `SectorScoreCard` should accept `ReliabilityData` as an optional prop — Story 4.4 will wire real data. The component must not crash when `ReliabilityData` is missing (use a sensible default or make it optional with `undefined`).

### 2. Thresholds — exact values from AC #1

```typescript
export type SignalColor = 'green' | 'orange' | 'red'; // reuse or import from sector-score-card.utils

// Criterion color logic:
function totalArticlesColor(n: number): SignalColor {
  if (n > 20) return 'green';
  if (n >= 5) return 'orange';
  return 'red';
}

function recentArticlesColor(n: number): SignalColor {
  if (n > 5)  return 'green';
  if (n >= 2) return 'orange';
  return 'red';
}

function sourceDiversityColor(n: number): SignalColor {
  if (n > 3)  return 'green';
  if (n >= 2) return 'orange';
  return 'red';
}

function punctualProportionColor(ratio: number): SignalColor {
  if (ratio < 0.35) return 'green';
  if (ratio <= 0.70) return 'orange';
  return 'red';
}
```

**Worst-of-4 priority:** red > orange > green

```typescript
export function computeReliabilityColor(data: ReliabilityData): SignalColor {
  const colors = [
    totalArticlesColor(data.totalArticles),
    recentArticlesColor(data.recentArticles),
    sourceDiversityColor(data.sourceCount),
    punctualProportionColor(data.punctualProportion)
  ];
  if (colors.includes('red'))    return 'red';
  if (colors.includes('orange')) return 'orange';
  return 'green';
}
```

### 3. Dropdown — 4 criterion rows

Each row shows a label and the criterion's individual color:

```typescript
export interface CriterionResult {
  label: string;
  color: SignalColor;
}

export function computeAllCriteria(data: ReliabilityData): CriterionResult[] {
  return [
    { label: 'Articles analysés',      color: totalArticlesColor(data.totalArticles) },
    { label: 'Articles récents (7j)',  color: recentArticlesColor(data.recentArticles) },
    { label: 'Sources distinctes',     color: sourceDiversityColor(data.sourceCount) },
    { label: 'Part ponctuelle',        color: punctualProportionColor(data.punctualProportion) }
  ];
}
```

> **Note:** Label language (FR/EN) — use English to match existing project language (sector names, narrative labels are English). Adjust if needed.

### 4. `ReliabilityIndicator.svelte` — component structure

Use Svelte 5 runes (`$props`, `$derived`, `$state`). Example skeleton:

```svelte
<script lang="ts">
  import type { ReliabilityData, SignalColor, CriterionResult } from './reliability-indicator.utils';
  import { computeReliabilityColor, computeAllCriteria } from './reliability-indicator.utils';

  let { data }: { data: ReliabilityData | undefined } = $props();

  const overallColor = $derived(data ? computeReliabilityColor(data) : 'orange');
  const criteria: CriterionResult[] = $derived(data ? computeAllCriteria(data) : []);

  let isOpen = $state(false);

  function toggle() { isOpen = !isOpen; }
  function close()  { isOpen = false; }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    if (e.key === 'Escape') close();
  }
</script>

<div class="reliability-wrapper">
  <button
    class="reliability-icon {overallColor}"
    aria-expanded={isOpen}
    aria-haspopup="true"
    onclick={toggle}
    onkeydown={handleKeydown}
  >
    <!-- Icon shape — circle or dot -->
  </button>

  {#if isOpen}
    <div class="reliability-dropdown">
      {#each criteria as criterion}
        <div class="criterion-row">
          <span class="criterion-dot {criterion.color}"></span>
          <span class="criterion-label">{criterion.label}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
```

**Mobile (≤480px):** hide dropdown via CSS:
```css
@media (max-width: 480px) {
  .reliability-dropdown { display: none !important; }
}
```

### 5. Icon shape

The UX spec says "Icon shape: decided at implementation." Use a small filled circle (8–10px diameter) as the icon. Optionally use a shield SVG if it reads more naturally as "reliability." Keep it minimal — a colored dot is sufficient and consistent with the design system's minimalist aesthetic.

### 6. Replacing the placeholder in `SectorScoreCard.svelte`

`SectorScoreCard.svelte` currently has:

```svelte
<!-- reliability slot — Story 4.3 will fill this -->
<div></div>
```

Replace with:

```svelte
<ReliabilityIndicator data={reliabilityData} />
```

And update `SectorScoreCardData` to include `reliabilityData`:

```typescript
// Option A — add ReliabilityData directly to SectorScoreCardData (simplest)
export interface SectorScoreCardProps {
  data: SectorScoreCardData;
  reliabilityData?: ReliabilityData;
}
```

OR pass `ReliabilityData` as a separate prop:

```svelte
let { data, reliabilityData }: { data: SectorScoreCardData; reliabilityData?: ReliabilityData } = $props();
```

**Recommendation:** Separate prop keeps `SectorScoreCardData` clean — it stays a `Pick<SectorScore, ...>` without mixing domain and meta concerns.

### 7. CSS tokens and design system (from Stories 4.1 + 4.2)

All tokens are defined in `src/routes/layout.css` under `@theme`:

```css
--color-surface-elevated: #242429;  /* dropdown background */
--color-green:            #22C55E;
--color-orange:           #F59E0B;
--color-red:              #EF4444;
--color-border:           #2E2E35;
--color-text-secondary:   #8A8A96;
```

**Tailwind v4 naming:** `--color-surface-elevated` → `bg-surface-elevated` (NOT `bg-color-surface-elevated`). The `--color-` prefix is stripped. Use `var(--color-surface-elevated)` for inline CSS or `bg-surface-elevated` as Tailwind utility.

**For dynamic color classes** (like `class={overallColor}`), use pre-defined CSS classes rather than dynamic Tailwind utilities:

```svelte
<button class="reliability-icon" style="background-color: var(--color-{overallColor});"></button>
```

OR use `class:green={overallColor === 'green'}` bindings (same pattern as `SectorScoreCard.svelte`).

**Dropdown text:** 12px, weight 400 (matches `.type-narrative-label` size).

### 8. Svelte 5 runes — no `export let`

Use `$props()`, `$derived()`, `$state()` throughout. Do NOT use `export let` (Svelte 4 syntax). See `SectorScoreCard.svelte` for the established pattern.

### 9. No `any` — TypeScript strict

Explicitly type all values. Reuse `SignalColor` from `sector-score-card.utils.ts` or redeclare it — but do NOT import it from server code (`$lib/server/...`). If reusing, import from `./sector-score-card.utils` which is a `$lib/components/` file (safe for UI).

### 10. Files to create / modify

| File | Action |
|---|---|
| `src/lib/components/reliability-indicator.utils.ts` | CREATE — `ReliabilityData`, `CriterionResult`, threshold functions, `computeReliabilityColor`, `computeAllCriteria` |
| `src/lib/components/reliability-indicator.utils.test.ts` | CREATE — unit tests for all pure functions |
| `src/lib/components/ReliabilityIndicator.svelte` | CREATE — icon + dropdown component |
| `src/lib/components/SectorScoreCard.svelte` | MODIFY — replace `<div></div>` placeholder with `<ReliabilityIndicator>` |
| `src/lib/components/sector-score-card.utils.ts` | MODIFY (optional) — export `SignalColor` type if `ReliabilityIndicator` needs to reuse it |

### 11. Anti-patterns to avoid

- **DO NOT** import anything from `$lib/server/` in `ReliabilityIndicator.svelte` or `reliability-indicator.utils.ts` — these are UI files only.
- **DO NOT** use `export let` (Svelte 4 syntax) — use `$props()`.
- **DO NOT** show the dropdown on mobile — CSS `display: none` at ≤480px is correct; no JS logic needed.
- **DO NOT** call an LLM or API to compute reliability — all logic is pure, synchronous, computed at render time.
- **DO NOT** reinvent `SignalColor` if it can be imported from `./sector-score-card.utils`.

### 12. Testing approach — pure functions only

Tests should be in `.test.ts` (not `.svelte`), no DOM setup needed. Follow the established pattern from `sector-score-card.utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeReliabilityColor, computeAllCriteria } from './reliability-indicator.utils';

describe('computeReliabilityColor', () => {
  it('returns red if any criterion is red', () => {
    expect(computeReliabilityColor({ totalArticles: 3, recentArticles: 6, sourceCount: 4, punctualProportion: 0.2 })).toBe('red');
  });
  it('returns orange if no red but at least one orange', () => {
    expect(computeReliabilityColor({ totalArticles: 10, recentArticles: 6, sourceCount: 4, punctualProportion: 0.2 })).toBe('orange');
  });
  it('returns green when all criteria are green', () => {
    expect(computeReliabilityColor({ totalArticles: 25, recentArticles: 8, sourceCount: 5, punctualProportion: 0.2 })).toBe('green');
  });
});
```

Test boundary values for each criterion (e.g., totalArticles: 5 → orange, 4 → red, 21 → green).

### References

- [Source: epics.md — Story 4.3] — Acceptance criteria, threshold values, keyboard accessibility requirements
- [Source: ux-design-specification.md — Reliability System] — Icon behavior, dropdown specs, mobile behavior
- [Source: ux-design-specification.md — Color System] — `--color-surface-elevated` (#242429) for dropdown
- [Source: 4-2-sector-score-card-component.md — Dev Notes §5] — Placeholder `<div></div>` location, slot strategy
- [Source: 4-1-design-system-setup.md — Tailwind v4] — `--color-X` → `x` naming, design tokens
- [Source: CLAUDE.md — Stack] — Svelte 5 + TypeScript strict, no `any`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- `reliability-indicator.utils.ts` exports `ReliabilityData`, `CriterionResult`, `computeReliabilityColor`, `computeAllCriteria` — all pure functions, zero imports from server layer
- `SignalColor` re-exported from `sector-score-card.utils` to avoid duplication
- `ReliabilityIndicator.svelte` uses Svelte 5 runes (`$props`, `$derived`, `$state`) — no `export let`
- Dropdown hidden via `display: none` at ≤480px (CSS only, no JS logic)
- Keyboard accessibility: Enter/Space toggle, Escape close, `aria-expanded`/`aria-haspopup` on button
- `SectorScoreCard.svelte`: `reliabilityData` added as separate optional prop; placeholder `<div></div>` replaced with `<ReliabilityIndicator data={reliabilityData} />`
- 24 unit tests added (all pass), 102 total suite (0 regressions)
- Pre-existing svelte-check errors in `sector-score.repository.integration.test.ts` (missing `punctualScore`/`structuralScore` — introduced by story 3.4, out of scope)

### File List

- `src/lib/components/reliability-indicator.utils.ts` (CREATED)
- `src/lib/components/reliability-indicator.utils.test.ts` (CREATED)
- `src/lib/components/ReliabilityIndicator.svelte` (CREATED)
- `src/lib/components/SectorScoreCard.svelte` (MODIFIED — import + prop + placeholder replaced)

## Change Log

- 2026-03-19: Story created — ready-for-dev
- 2026-03-19: Implemented ReliabilityIndicator — 4-criteria icon + desktop dropdown + keyboard accessibility, wired into SectorScoreCard (24 unit tests, 0 regressions)
