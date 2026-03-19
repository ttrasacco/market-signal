# Story 5.3: E2E Smoke Test — Dashboard Loads with Sector Scores

Status: review

## Story

As a developer,
I want a Playwright E2E smoke test that verifies the dashboard loads and displays sector scores,
So that regressions in the full stack (DB → use case → SSR → render) are caught automatically.

## Acceptance Criteria

1. **Given** a Playwright test in `e2e/dashboard.e2e.ts`
   **When** the test navigates to `/`
   **Then** the topbar brand text "market-signal" is visible
   **And** the `.sector-table` container is rendered
   **And** no JS console errors are thrown on load

2. **Given** the `sector_scores` table is empty (or contains data)
   **When** the E2E test runs
   **Then** the dashboard renders without crashing (either `.empty-zone` OR `.sector-table` with rows)
   **And** the page loads within 3 seconds (NFR1)

## Tasks / Subtasks

- [x] Task 1 — Add `data-testid` attributes to critical dashboard DOM elements (AC: #1, #2)
    - [x] Add `data-testid="topbar"` to `nav.topbar` in `src/lib/components/topbar/Topbar.svelte`
    - [x] Add `data-testid="sector-table"` to `div.sector-table` in `src/lib/components/dashboard-layout/DashboardLayout.svelte`
    - [x] Add `data-testid="empty-zone"` to `div.empty-zone` in `src/lib/components/dashboard-layout/DashboardLayout.svelte`
    - [x] Add `data-testid="sector-row"` to the root element of `src/lib/components/sector-row/SectorRow.svelte`

- [x] Task 2 — Create `e2e/dashboard.e2e.ts` smoke test (AC: #1, #2)
    - [x] Navigate to `/` and assert no console errors during load
    - [x] Assert `.topbar-name` text equals "market-signal"
    - [x] Assert `[data-testid="sector-table"]` is visible
    - [x] Assert either `[data-testid="sector-row"]` count > 0 OR `[data-testid="empty-zone"]` is visible (handles both DB states)
    - [x] Assert page load time < 3 seconds

- [x] Task 3 — Run full test suite (AC: #1, #2)
    - [x] Run `npm run test:unit -- --run` — must pass 0 regressions (currently 122 tests)
    - [x] Run `npm run test:e2e` — new E2E test must pass

## Dev Notes

### Critical: Test File Naming Convention

**The epics mention `dashboard.spec.ts` but this is WRONG for this project.**

The `playwright.config.ts` uses `testMatch: '**/*.e2e.{ts,js}'` — the file **MUST** be named:

```
e2e/dashboard.e2e.ts
```

A file named `dashboard.spec.ts` will **not be picked up** by Playwright.

---

### Playwright Config (read-only — do NOT modify)

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
    webServer: { command: 'npm run build && npm run preview', port: 4173 },
    testMatch: '**/*.e2e.{ts,js}'
});
```

- App auto-starts on `localhost:4173` via `npm run build && npm run preview`
- No custom browser, timeout, or reporter config — Playwright defaults apply
- Default browser: Chromium
- Default timeout: 30 seconds per test

---

### Dashboard DOM Structure (actual, verified from source)

```
nav.topbar                              ← sticky nav
  div.topbar-left
    div.topbar-logo-dot                 ← green dot
    span.topbar-name                    ← "market-signal"
  div.topbar-right                      ← "Sector signals"

div.page-date                           ← date below topbar

div.page                                ← DashboardLayout root
  [if sectors with score != 0]
    div.section-label  "Momentum"
    div.highlight-grid                  ← 3-col grid, bullish cards
    div.section-label  "Pressure"
    div.highlight-grid                  ← 3-col grid, bearish cards
  [else]
    div.empty-zone                      ← "No significant sectoral momentum or pressure detected"
  hr.divider
  div.section-label  "All sectors"
  div.sector-table                      ← flex column, always rendered
    SectorRow × N                       ← one per sector with data
  div.legend
```

**Key**: `.sector-table` is **always** rendered (even empty). `.empty-zone` only renders when no sector has a non-zero score for highlights. The test strategy must account for this.

---

### Adding `data-testid` Attributes

The project has no `data-testid` attributes yet. Task 1 adds them to make selectors stable:

**`src/lib/components/topbar/Topbar.svelte`** — add to `<nav>`:

```svelte
<nav class="topbar" data-testid="topbar">
```

**`src/lib/components/dashboard-layout/DashboardLayout.svelte`** — add to two elements:

```svelte
<div class="sector-table" data-testid="sector-table">
<div class="empty-zone" data-testid="empty-zone">
```

**`src/lib/components/sector-row/SectorRow.svelte`** — add to the root `<button>` or `<div>`:

```svelte
<!-- Find the root element and add: -->
data-testid="sector-row"
```

---

### E2E Test Implementation

```typescript
// e2e/dashboard.e2e.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard smoke test', () => {
    test('loads without errors and renders sector table', async ({ page }) => {
        const consoleErrors: string[] = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
        });

        const start = Date.now();
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - start;

        // Brand visible
        await expect(page.locator('.topbar-name')).toHaveText('market-signal');

        // Sector table always rendered
        await expect(page.locator('[data-testid="sector-table"]')).toBeVisible();

        // Either rows are visible OR empty zone is shown — both are valid states
        const rowCount = await page.locator('[data-testid="sector-row"]').count();
        const emptyZoneVisible = await page.locator('[data-testid="empty-zone"]').isVisible();
        expect(rowCount > 0 || emptyZoneVisible).toBe(true);

        // No JS console errors
        expect(consoleErrors).toHaveLength(0);

        // NFR1: load < 3 seconds
        expect(loadTime).toBeLessThan(3000);
    });
});
```

---

### DB State During E2E Tests

The E2E test runs against the **real database** (via `DATABASE_URL` env var). The test is designed to pass in **both** states:

- DB has data → `.sector-table` has sector rows
- DB is empty → `.empty-zone` shows, `.sector-table` is rendered but empty

**No seeding/cleanup required** — the test is resilient to either state.

---

### SectorRow Root Element

Before adding `data-testid="sector-row"`, inspect `SectorRow.svelte` to confirm the root element. From source analysis: the root is a `<button>` or `<div>` with class `.sector-row`. Add `data-testid` to this root element only.

---

### Test Run Commands

```bash
# Unit tests (must stay at 122/122)
npm run test:unit -- --run

# E2E tests (builds app first — takes ~10-20s)
npm run test:e2e

# Combined
npm run test
```

---

### Anti-Patterns to Avoid

- ❌ Do NOT name the file `dashboard.spec.ts` — won't match `**/*.e2e.{ts,js}` pattern
- ❌ Do NOT modify `playwright.config.ts`
- ❌ Do NOT seed/truncate DB in tests — test is resilient to both states
- ❌ Do NOT use fixed `page.waitForTimeout(3000)` — use `waitForLoadState('networkidle')`
- ❌ Do NOT test `GET /api/sector-scores` directly in E2E — test the full browser experience
- ❌ Do NOT add more than minimal `data-testid` attributes — only what's needed for this story

### Architecture Compliance

- **No domain/application changes** — this is a test + minimal UI attribute addition
- **No new routes or handlers**
- **No DB migrations**
- `data-testid` attributes are UI instrumentation, not business logic — acceptable in Svelte components

---

### Files to Create / Modify

| File                                                         | Action     | Notes                                                |
| ------------------------------------------------------------ | ---------- | ---------------------------------------------------- |
| `e2e/dashboard.e2e.ts`                                       | **CREATE** | Playwright smoke test                                |
| `src/lib/components/topbar/Topbar.svelte`                    | **MODIFY** | Add `data-testid="topbar"` to `<nav>`                |
| `src/lib/components/dashboard-layout/DashboardLayout.svelte` | **MODIFY** | Add `data-testid` to `sector-table` and `empty-zone` |
| `src/lib/components/sector-row/SectorRow.svelte`             | **MODIFY** | Add `data-testid="sector-row"` to root element       |

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Playwright browsers not installed — ran `npx playwright install chromium` before E2E tests could execute.

### Completion Notes List

- Task 1: Added `data-testid` to `nav.topbar` (Topbar.svelte), `div.sector-table` and `div.empty-zone` (DashboardLayout.svelte), `div.sector-row` (SectorRow.svelte).
- Task 2: Created `e2e/dashboard.e2e.ts` — 1 test covering brand visibility, sector-table rendering, empty/data state resilience, 0 console errors, NFR1 load time < 3s.
- Task 3: `npm run test:unit -- --run` — 122/122 pass (0 regressions). `npm run test:e2e` — 1/1 pass in 1.2s.

### File List

- `e2e/dashboard.e2e.ts` — created: Playwright E2E smoke test
- `src/lib/components/topbar/Topbar.svelte` — modified: added `data-testid="topbar"` to `<nav>`
- `src/lib/components/dashboard-layout/DashboardLayout.svelte` — modified: added `data-testid="sector-table"` and `data-testid="empty-zone"`
- `src/lib/components/sector-row/SectorRow.svelte` — modified: added `data-testid="sector-row"` to root `<div>`

## Change Log

- 2026-03-19: Added 4 `data-testid` attributes to dashboard components; created `e2e/dashboard.e2e.ts` Playwright smoke test. 122 unit tests + 1 E2E test pass.
