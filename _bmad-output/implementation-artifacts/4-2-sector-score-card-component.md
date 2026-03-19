# Story 4.2: SectorScoreCard Component — Ripple Cast Visual + Narrative Label

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want each sector card to display a Ripple Cast visual encoding PUNCTUAL (inner ring) and STRUCTURAL (outer ripples) signals with independent colors, plus a narrative label,
so that I can read sector conviction state at a glance without understanding the decay formula.

## Acceptance Criteria

1. **Given** a `SectorScoreCard` receives a `SectorScore` with PUNCTUAL and STRUCTURAL sub-scores
   **When** it renders
   **Then** the inner ring color reflects the PUNCTUAL score (green/orange/red thresholds)
   **And** the outer ripples color reflects the STRUCTURAL score (green/orange/red thresholds)
   **And** the two colors are independently determined

2. **Given** the Ripple Cast shows a specific PUNCTUAL × STRUCTURAL color combination
   **When** the narrative label is derived
   **Then** it matches the 9-state lookup table (e.g. green × green → "Confirmed momentum", red × red → "Widespread deterioration")
   **And** the label is computed statically at render time — no LLM call

3. **Given** the card renders on mobile
   **When** viewport width is below the mobile breakpoint (480px)
   **Then** card padding is 12px and visual weight is reduced while information hierarchy is preserved

## Tasks / Subtasks

- [ ] Task 1 — Define `SectorScoreCardProps` type and scoring-to-color logic (AC: #1, #2)
  - [ ] Create `src/lib/components/SectorScoreCard.svelte`
  - [ ] Define prop type: `SectorScoreCardData = Pick<SectorScore, 'sector' | 'score' | 'punctualScore' | 'structuralScore'>` (see Dev Notes — Story 3.4 provides real sub-scores)
  - [ ] Implement `scoreToColor(score: number): 'green' | 'orange' | 'red'` pure function
  - [ ] Implement `getNarrativeLabel(punctualColor, structuralColor): string` 9-state lookup table

- [ ] Task 2 — Implement Ripple Cast SVG/CSS structure (AC: #1)
  - [ ] Outer ring (`.ripple-outer` + `.ripple-outer-2`) colored by structural color
  - [ ] Inner ring (`.ripple-inner`) colored by punctual color
  - [ ] Apply `ripple-pulse` animation (3s ease-in-out infinite)
  - [ ] Card header: sector name (`.type-sector-name`) + narrative label below

- [ ] Task 3 — Mobile responsiveness (AC: #3)
  - [ ] Card padding: 16px desktop → 12px at ≤480px breakpoint
  - [ ] Match HTML mockup responsive behavior

- [ ] Task 4 — Unit test for pure logic (no DOM)
  - [ ] Test `scoreToColor`: boundary values (score > 0.2 → green, -0.2 to 0.2 → orange, < -0.2 → red — see Dev Notes for exact thresholds)
  - [ ] Test `getNarrativeLabel`: all 9 combinations

## Dev Notes

### 1. What `SectorScore` provides (after Story 3.4)

Story 3.4 (`3-4-sector-score-sub-scores`) extends `SectorScore` with two sub-scores. **Story 3.4 must be done before implementing this story.**

`SectorScore` (from `src/lib/server/contexts/scoring/domain/sector-score.ts`) is:
```typescript
interface SectorScore {
  date: Date;
  sector: Sector;
  score: number;          // composite = punctualScore + structuralScore
  punctualScore: number;  // Σ decayed PUNCTUAL impacts → drives inner ring color
  structuralScore: number; // Σ decayed STRUCTURAL impacts → drives outer ripples color
}
```

**Decision for this story:** The `SectorScoreCard` component accepts `SectorScore` directly as its prop — no adapter type needed. The real sub-scores are available from the domain.

```typescript
// In src/lib/components/sector-score-card.utils.ts
export type SectorScoreCardData = Pick<SectorScore, 'sector' | 'score' | 'punctualScore' | 'structuralScore'>;
```

**Important:** The `SectorScoreCard` is a **UI component** — it lives in `src/lib/components/`, NOT in `src/lib/server/`. Import the `SectorScore` type from `$lib/server/contexts/scoring/domain/sector-score` only to derive the prop type — no server logic in the component.

### 2. Score-to-color thresholds

From the HTML mockup patterns (green = positive, red = negative, orange = neutral zone):

```typescript
function scoreToColor(score: number): 'green' | 'orange' | 'red' {
  if (score > 0.2)  return 'green';
  if (score < -0.2) return 'red';
  return 'orange';
}
```

> **Note:** These thresholds (±0.2) are reasonable defaults. The PRD/epics do not specify exact numeric thresholds — use ±0.2 as a starting point, can be tuned later.

### 3. Narrative label — 9-state lookup table

From UX-DR5 + HTML mockup examples:

| PUNCTUAL color | STRUCTURAL color | Label |
|---|---|---|
| green  | green  | "Confirmed momentum" |
| green  | orange | "Healthy · caution ahead" |
| green  | red    | "Recovery · structural drag" |
| orange | green  | "Turbulence · rebound expected" |
| orange | orange | "Mixed signal" |
| orange | red    | "Growing pressure" |
| red    | green  | "Crisis · uncertain stabilization" |
| red    | orange | "Crisis · uncertain stabilization" |
| red    | red    | "Widespread deterioration" |

> These labels are derived from the HTML mockup examples. Map them consistently.

### 4. Ripple Cast HTML structure (from `ux-design-directions.html`)

The exact CSS class structure to replicate in Svelte:

```html
<!-- Full-size Ripple Cast (for highlight cards) -->
<div class="ripple-wrapper">
  <div class="ripple">                          <!-- 72×72px container -->
    <div class="ripple-outer {structuralColor}"></div>   <!-- 72px, opacity 0.35, animated -->
    <div class="ripple-outer-2 {structuralColor}"></div> <!-- 52px, opacity 0.2, animated -->
    <div class="ripple-inner {punctualColor}"></div>     <!-- 32px inner ring -->
  </div>
</div>

<!-- Mini Ripple Cast (for sector table rows in story 4.4) -->
<div class="mini-ripple">                       <!-- 28×28px container -->
  <div class="mini-ripple-outer {structuralColor}"></div>
  <div class="mini-ripple-inner {punctualColor}"></div>
</div>
```

**CSS values from mockup:**
- `.ripple`: `position: relative; width: 72px; height: 72px; display: flex; align-items: center; justify-content: center;`
- `.ripple-outer`: `position: absolute; width: 72px; height: 72px; border-radius: 50%; border: 1px solid transparent; opacity: 0.35; animation: ripple-pulse 3s ease-in-out infinite;`
- `.ripple-outer-2`: same but `width: 52px; height: 52px; border: 0.5px; opacity: 0.2`
- `.ripple-inner`: `width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid transparent; position: relative; z-index: 1;`
- Color variants (use Tailwind v4 tokens or inline CSS custom properties):
  - `green`: `border-color: var(--color-green)` + `box-shadow: 0 0 12px rgba(34,197,94,0.2)` (outer only)
  - `orange`: `border-color: var(--color-orange)` + `box-shadow: 0 0 12px rgba(245,158,11,0.2)` (outer only)
  - `red`: `border-color: var(--color-red)` + `box-shadow: 0 0 12px rgba(239,68,68,0.2)` (outer only)
  - Inner: `green` → `background: rgba(34,197,94,0.08)`, `orange` → `background: rgba(245,158,11,0.08)`, `red` → `background: rgba(239,68,68,0.08)`
- `ripple-pulse` animation: `0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.04); }`

### 5. Full card structure from the mockup

```html
<div class="ripple-card">              <!-- bg-surface, border, border-radius: 12px, padding: 16px -->
  <div class="ripple-card-header">    <!-- flex justify-between items-start -->
    <div>
      <div class="sector-name">Technology</div>          <!-- .type-sector-name: 15px/500 in mockup, AC says 16px -->
      <div class="narrative-label">Confirmed momentum</div>  <!-- 11px/400, text-secondary in mockup -->
    </div>
    <!-- reliability-btn slot → Story 4.3 will fill this -->
    <div></div>
  </div>
  <div class="ripple-wrapper">
    <!-- Ripple Cast visual here -->
  </div>
</div>
```

**Reliability icon:** Leave a placeholder `<slot name="reliability" />` or an empty `<div>` for the reliability button — Story 4.3 will implement the reliability indicator as a separate component that gets composed into the card.

### 6. Tailwind v4 naming convention (critical — from Story 4.1)

In Tailwind v4, `--color-bg` → `bg-bg` (NOT `bg-color-bg`). The `--color-` prefix is stripped:
- `--color-surface` → `bg-surface`
- `--color-border` → `border-border`
- `--color-text-primary` → `text-text-primary`
- `--color-green` → `text-green` / `bg-green`

For the Ripple Cast colors (border-color, box-shadow), use **inline CSS with CSS custom properties** rather than Tailwind utilities, as Tailwind does not easily handle dynamic `border-color` based on a variable color:

```svelte
<div
  class="ripple-outer"
  style="border-color: var(--color-{structuralColor}); box-shadow: 0 0 12px {shadowColor};"
></div>
```

Or use `class:green={structuralColor === 'green'}` with pre-defined CSS classes in `<style>`.

### 7. Component location and naming

Per architecture (`architecture.md` → Project Structure section):
- `src/lib/components/SectorScoreCard.svelte` ← THIS story
- `src/lib/components/SectorScoreGrid.svelte` ← Story 4.2/4.4 (can skip for now)
- `src/lib/components/DashboardLayout.svelte` ← Story 4.4

**Do NOT** place components under `src/lib/server/` — that is for server-only code.

### 8. Svelte 5 syntax (project uses Svelte 5)

Project uses `svelte: ^5.51.0`. Use Svelte 5 runes:

```svelte
<script lang="ts">
  import type { SectorScoreCardData } from './types';

  let { data }: { data: SectorScoreCardData } = $props();

  const punctualColor = $derived(scoreToColor(data.punctualScore));
  const structuralColor = $derived(scoreToColor(data.structuralScore));
  const narrativeLabel = $derived(getNarrativeLabel(punctualColor, structuralColor));
</script>
```

Use `$props()`, `$derived()` — not the old `export let` syntax unless needed for compatibility.

### 9. No `any` — TypeScript strict

Color union type: `type SignalColor = 'green' | 'orange' | 'red';`

### 10. Tests — unit tests only, no DOM

Tests for `scoreToColor` and `getNarrativeLabel` should be in `.test.ts` files (pure TypeScript), not `.svelte` tests. Extract the pure functions to a utility file or test them by importing the helper module:

```
src/lib/components/sector-score-card.utils.ts   ← pure helpers
src/lib/components/sector-score-card.utils.test.ts
```

OR export the helpers from the `.svelte` file and test in a co-located `.test.ts`. Since Svelte 5 component testing with Vitest requires `@testing-library/svelte`, **prefer extracting pure logic to a `.utils.ts` file** to keep tests simple — no DOM setup needed.

### 11. Files to create

| File | Action |
|---|---|
| `src/lib/components/SectorScoreCard.svelte` | CREATE |
| `src/lib/components/sector-score-card.utils.ts` | CREATE (scoreToColor, getNarrativeLabel, SectorScoreCardData type) |
| `src/lib/components/sector-score-card.utils.test.ts` | CREATE (unit tests) |

### Project Structure Notes

- Components live at `src/lib/components/` — NOT `src/lib/server/components/`
- `src/lib/utils.ts` (cn() helper from Story 4.1) is available for class merging
- `src/routes/layout.css` has typography classes: `.type-sector-name`, `.type-narrative-label`, `.type-section-heading`
- `src/routes/layout.css` has shadcn CSS vars: `--border`, `--card`, `--muted-foreground`, etc.
- Tailwind v4 custom tokens: `bg-surface`, `border-border`, `text-text-primary`, `text-text-secondary`, `text-green`, `text-orange`, `text-red`

### References

- [Source: ux-design-directions.html] — Ripple Card markup (lines 504–648), CSS (lines 144–241), narrative label examples
- [Source: epics.md — Story 4.2] — Acceptance criteria, 9-state narrative label requirement
- [Source: architecture.md — Frontend Architecture] — Components in `src/lib/components/`, SSR/no client state
- [Source: architecture.md — Naming Patterns] — PascalCase components, kebab-case files
- [Source: CLAUDE.md — Stack] — Svelte 5 + TypeScript strict, no `any`
- [Source: 4-1-design-system-setup.md — Implementation Notes] — Tailwind v4 naming (`bg-bg` not `bg-color-bg`)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
