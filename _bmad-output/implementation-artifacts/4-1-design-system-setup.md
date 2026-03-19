# Story 4.1 — Design System Setup

**Status:** ready-for-dev
**Epic:** 4 — Dashboard: Sector Conviction at a Glance
**Story ID:** 4.1
**Date:** 2026-03-19

---

## User Story

As a developer,
I want Tailwind CSS configured with the full dark color token system, shadcn-svelte installed, and Inter font applied,
So that all dashboard components share a consistent visual foundation from the start.

---

## Acceptance Criteria

**Given** `src/routes/layout.css` (the existing Tailwind entry point) is updated
**When** the app builds
**Then** the 9 custom color tokens are available as Tailwind utilities:
- `bg-color-bg`, `bg-color-surface`, `bg-color-surface-elevated`
- `border-color-border`
- `text-color-text-primary`, `text-color-text-secondary`
- `text-color-green`, `text-color-orange`, `text-color-red`
**And** `bg-color-bg` (`#0F0F11`) is applied to `body` via `+layout.svelte`

**Given** shadcn-svelte is installed
**When** components are scaffolded with `npx shadcn-svelte@latest add <component>`
**Then** they use the custom dark theme tokens rather than shadcn defaults

**Given** Inter is configured as the primary font with `system-ui` fallback
**When** any text renders
**Then** sector names render at weight 500/16px, narrative labels at 400/12px uppercase, section headings at 600/13px uppercase

---

## Technical Implementation Guide

### 1. Current State

- **Tailwind v4** is already installed (`tailwindcss: ^4.1.18`, `@tailwindcss/vite: ^4.1.18`)
- The Tailwind entry point is `src/routes/layout.css` (currently just `@import 'tailwindcss';`)
- This CSS is imported in `src/routes/+layout.svelte` via `import './layout.css'`
- **No `tailwind.config.ts` file** — Tailwind v4 uses CSS-based configuration (`@theme`)
- shadcn-svelte is **NOT installed** yet — no components exist under `src/lib/components/`
- Svelte 5 is in use (`svelte: ^5.51.0`)

### 2. Color Token System

Define all 9 tokens as Tailwind v4 `@theme` variables in `src/routes/layout.css`.
These are the **exact values** from `_bmad-output/planning-artifacts/ux-design-directions.html`:

```css
@import 'tailwindcss';

@theme {
  --color-bg:               #0F0F11;
  --color-surface:          #1A1A1F;
  --color-surface-elevated: #242429;
  --color-border:           #2E2E35;
  --color-text-primary:     #F0F0F2;
  --color-text-secondary:   #8A8A96;
  --color-green:            #22C55E;
  --color-orange:           #F59E0B;
  --color-red:              #EF4444;
}
```

**Tailwind v4 `@theme` behavior:** variables defined here automatically generate utilities:
- `--color-bg` → `bg-bg`, `text-bg`, `border-bg` etc. (Tailwind v4 prefixes with `color-` from the CSS var name minus `--color-`)
- Access as: `bg-bg`, `bg-surface`, `bg-surface-elevated`, `text-text-primary`, `text-green`, `border-border`, etc.

> **IMPORTANT — Tailwind v4 naming:** In Tailwind v4, `--color-bg` generates the utility `bg-bg` (NOT `bg-color-bg`). The `--color-` prefix is stripped. So `--color-surface` → `bg-surface`, `--color-text-primary` → `text-text-primary`, `--color-green` → `text-green` / `bg-green`. Verify this is consistent across the codebase.

### 3. Inter Font Setup

**Approach:** Use `@fontsource/inter` (npm package) to avoid external network requests, OR use the Google Fonts link from the HTML mockup.

**Recommended:** Add `@fontsource/inter` to avoid network dependency:
```bash
npm install @fontsource/inter
```

Then import in `src/routes/layout.css`:
```css
@import '@fontsource/inter/400.css';
@import '@fontsource/inter/500.css';
@import '@fontsource/inter/600.css';
```

**Alternative (simpler, matches mockup):** Add Google Fonts link in `src/routes/+layout.svelte` inside `<svelte:head>`.

Apply font globally in `layout.css`:
```css
@layer base {
  body {
    background-color: theme(--color-bg);
    color: theme(--color-text-primary);
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    min-height: 100vh;
  }
}
```

### 4. shadcn-svelte Installation

shadcn-svelte works with **Svelte 5**. Use the latest CLI:

```bash
npx shadcn-svelte@latest init
```

During init, choose:
- Style: **Default** (we'll override all colors via Tailwind theme)
- Base color: select any (will be overridden)
- CSS variables: **Yes** (use CSS variables for theming)

This will:
- Create `src/lib/components/ui/` directory
- Add `src/lib/utils.ts` with `cn()` helper (tailwind-merge + clsx)
- Potentially modify `svelte.config.ts` and `package.json`
- Potentially create or modify `components.json`

**After init, customize the generated CSS** to match the dark theme tokens rather than shadcn defaults. Map shadcn's CSS variables (`--background`, `--foreground`, etc.) to our tokens in `layout.css`.

Typical shadcn-svelte dark theme mapping:
```css
:root {
  --background: #0F0F11;      /* --color-bg */
  --foreground: #F0F0F2;      /* --color-text-primary */
  --card: #1A1A1F;            /* --color-surface */
  --card-foreground: #F0F0F2;
  --border: #2E2E35;          /* --color-border */
  --muted: #242429;           /* --color-surface-elevated */
  --muted-foreground: #8A8A96;/* --color-text-secondary */
  --radius: 0.75rem;          /* 12px — matches ripple-card border-radius */
}
```

### 5. Typography Class Utilities

Define reusable typography classes in `layout.css` for consistency:

```css
@layer components {
  .type-sector-name {
    font-size: 16px;       /* 15px in mockup, AC says 16px — use AC */
    font-weight: 500;
  }
  .type-narrative-label {
    font-size: 12px;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 0.01em;
    color: theme(--color-text-secondary);
  }
  .type-section-heading {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: theme(--color-text-secondary);
  }
}
```

### 6. Files to Create/Modify

| File | Action | Notes |
|---|---|---|
| `src/routes/layout.css` | **MODIFY** | Add `@theme` block + font imports + base styles |
| `src/routes/+layout.svelte` | **MODIFY** | Apply `bg-bg min-h-screen` to body wrapper or add font link in `<svelte:head>` |
| `src/routes/+page.svelte` | **MODIFY** | Remove default SvelteKit welcome content, replace with minimal placeholder |
| `components.json` | **CREATE** | Generated by shadcn-svelte init |
| `src/lib/utils.ts` | **CREATE** | Generated by shadcn-svelte init (cn() helper) |
| `src/lib/components/ui/` | **CREATE** | shadcn-svelte generated component folder |

### 7. Architecture Note — Frontend Components Location

Per architecture (`src/lib/components/`), Svelte UI components live at:
```
src/lib/components/
├── SectorScoreCard.svelte       ← Story 4.2
├── SectorScoreGrid.svelte       ← Story 4.2/4.4
└── DashboardLayout.svelte       ← Story 4.4
```

shadcn-svelte generated primitives go in `src/lib/components/ui/` (shadcn convention, nested under `components/`).

**This story does NOT create any of the above SvelteKit components** — only the design system foundation.

### 8. No Tests Required

This story is pure configuration — Tailwind setup, shadcn-svelte init, font setup. No domain logic, no ports, no use cases. No unit tests needed. Verify visually that:
- `bg-bg` background applies (dark `#0F0F11`)
- Inter font loads
- shadcn-svelte `cn()` helper is importable

---

## Visual Reference

**Mandatory:** Open `_bmad-output/planning-artifacts/ux-design-directions.html` in a browser before implementing. The `:root` block (lines 11–21) defines all 9 color tokens. The `body` style (lines 28–33) defines font family, size, and background.

---

## Completion Checklist

- [ ] `src/routes/layout.css` updated with `@theme` block (9 tokens)
- [ ] Inter font configured (fontsource npm OR Google Fonts link in `<svelte:head>`)
- [ ] `body` receives `background: #0F0F11` and `font-family: 'Inter', system-ui`
- [ ] shadcn-svelte init completed (`components.json` present)
- [ ] shadcn-svelte dark theme tokens mapped to our color system
- [ ] `src/routes/+page.svelte` cleared of default SvelteKit content
- [ ] Build passes: `npm run build`
- [ ] Type check passes: `npm run check`
