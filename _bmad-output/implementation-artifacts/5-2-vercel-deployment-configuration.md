# Story 5.2: Vercel Deployment Configuration & Environment Validation

Status: ready-for-dev

## Story

As a developer,
I want `vercel.json`, `.env.example`, and `src/app.d.ts` fully configured,
so that the app deploys cleanly to Vercel with Neon PostgreSQL and all required environment variables are documented and typed.

## Acceptance Criteria

1. **Given** `vercel.json` exists at project root
   **When** it is read
   **Then** it contains: `adapter-vercel` configuration, the daily cron schedule, and no hardcoded secrets

2. **Given** `.env.example` exists
   **When** it is read
   **Then** it documents all required env vars: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `CRON_SECRET`
   **And** all values are placeholders — no real credentials

3. **Given** `src/app.d.ts` is updated
   **When** TypeScript compiles
   **Then** `DATABASE_URL`, `ANTHROPIC_API_KEY`, and `CRON_SECRET` are typed under `App.Env` (SvelteKit private env convention)
   **And** none of these vars are accessible from client-side code

4. **Given** the app is deployed to Vercel
   **When** a request hits `/dashboard`
   **Then** the page loads in under 3 seconds on standard broadband (NFR1)

## Tasks / Subtasks

- [ ] Task 1 — Switch adapter from `adapter-auto` to `adapter-vercel` (AC: #1)
  - [ ] Install `@sveltejs/adapter-vercel`: `npm install -D @sveltejs/adapter-vercel`
  - [ ] Update `svelte.config.js`: replace `@sveltejs/adapter-auto` import with `@sveltejs/adapter-vercel`
  - [ ] Keep adapter configuration minimal (no custom options needed)

- [ ] Task 2 — Update `vercel.json` with correct structure (AC: #1)
  - [ ] `vercel.json` already exists at project root with cron schedule — verify it's correct
  - [ ] Ensure the file contains only the cron config: `{ "crons": [{ "path": "/api/cron/daily", "schedule": "0 6 * * *" }] }`
  - [ ] Confirm no hardcoded secrets or credentials

- [ ] Task 3 — Create `.env.example` (AC: #2)
  - [ ] Create `.env.example` at project root documenting all 3 required env vars with placeholder values
  - [ ] Verify `.env.example` is NOT listed in `.gitignore` (it should be committed)
  - [ ] Verify `.env` (actual secrets) IS listed in `.gitignore`

- [ ] Task 4 — Update `src/app.d.ts` to type env vars (AC: #3)
  - [ ] Add `App.Env` interface inside the `namespace App` block
  - [ ] Declare `DATABASE_URL: string`, `ANTHROPIC_API_KEY: string`, `CRON_SECRET: string`
  - [ ] Confirm TypeScript compiles: `npm run check`

- [ ] Task 5 — Validate overall TypeScript + build (AC: #3, #4)
  - [ ] Run `npm run check` — 0 errors
  - [ ] Run `npm run build` — successful build with `adapter-vercel`

## Dev Notes

### Current State of Files

**`vercel.json`** — already exists with correct content:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 6 * * *"
    }
  ]
}
```
→ No change required unless validation reveals an issue.

**`.env.example`** — does NOT exist yet. Create it.

**`src/app.d.ts`** — exists but is empty (all interfaces commented out). Needs `App.Env` added.

**`svelte.config.js`** — currently uses `adapter-auto`. Must switch to `adapter-vercel`.

---

### Adapter Switch: `adapter-auto` → `adapter-vercel`

The project currently uses `@sveltejs/adapter-auto` (devDependency). For production Vercel deployment, switch to the explicit `@sveltejs/adapter-vercel`:

```bash
npm install -D @sveltejs/adapter-vercel
```

Update `svelte.config.js`:

```javascript
// BEFORE
import adapter from '@sveltejs/adapter-auto';

// AFTER
import adapter from '@sveltejs/adapter-vercel';
```

No other changes to `svelte.config.js` — keep the existing `vitePlugin` config intact:
```javascript
const config = {
  kit: {
    adapter: adapter()  // no options needed
  },
  vitePlugin: {
    dynamicCompileOptions: ({ filename }) =>
      filename.includes('node_modules') ? undefined : { runes: true }
  }
};
```

---

### `.env.example` — Create from Scratch

Create `/.env.example` at project root:

```env
# Database connection string (Neon PostgreSQL)
DATABASE_URL=postgres://user:password@host/dbname

# Anthropic API key for LLM classification
ANTHROPIC_API_KEY=sk-ant-...

# Secret used by Vercel Cron to authenticate /api/cron/daily requests
CRON_SECRET=your-cron-secret-here
```

**Important checks:**
- `.env.example` must be committed to git (it documents required vars — contains no real secrets)
- `.env` must remain in `.gitignore` (contains real credentials — never commit)
- Verify `.gitignore` already has `.env` listed (it should from project init)

---

### `src/app.d.ts` — Add `App.Env`

SvelteKit uses `App.Env` in `app.d.ts` to type private environment variables (those imported via `$env/static/private` or `$env/dynamic/private`). This prevents accidental client-side exposure at compile time.

```typescript
// src/app.d.ts
declare global {
  namespace App {
    interface Env {
      DATABASE_URL: string;
      ANTHROPIC_API_KEY: string;
      CRON_SECRET: string;
    }
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
```

**Why this matters:**
- SvelteKit's type system uses `App.Env` to validate that env vars imported from `$env/static/private` or `$env/dynamic/private` are properly declared
- Variables in `App.Env` are NOT accessible from client-side Svelte files — TypeScript will error if you try
- This is a SvelteKit convention, not a runtime guard — it's compile-time safety

---

### Architecture Compliance

- **No domain/application changes needed** — this is pure infrastructure & config
- **No new routes or handlers** — no hexagonal architecture concerns
- **No DB migrations** — no schema changes
- **No tests required** — config files have no business logic to unit test; TypeScript compilation (`npm run check`) and build (`npm run build`) serve as validation

---

### Key Files

| File | Action | Notes |
|---|---|---|
| `svelte.config.js` | **MODIFY** | Replace `adapter-auto` with `adapter-vercel` |
| `vercel.json` | **VERIFY (no change expected)** | Already has correct cron config |
| `.env.example` | **CREATE** | 3 env vars with placeholder values |
| `src/app.d.ts` | **MODIFY** | Add `App.Env` interface with 3 typed vars |
| `package.json` | **MODIFY** (via npm install) | Add `@sveltejs/adapter-vercel` to devDependencies |

---

### Anti-Patterns to Avoid

- ❌ Do NOT import env vars from `$env/static/public` — all 3 vars are server-side secrets
- ❌ Do NOT put real credentials in `.env.example` — placeholders only
- ❌ Do NOT add `adapter-vercel` to regular `dependencies` — it's a build tool, belongs in `devDependencies`
- ❌ Do NOT remove the existing `vitePlugin.dynamicCompileOptions` in `svelte.config.js` — it configures Svelte 5 runes mode
- ❌ Do NOT create a `.env` file — never commit actual credentials; `.env.example` is the artifact

---

### Validation Sequence

After all changes:

```bash
npm run check    # TypeScript + SvelteKit type check — must pass 0 errors
npm run build    # Production build with adapter-vercel — must succeed
npm run test:unit -- --run  # All existing unit tests must still pass (0 regressions)
```

---

### Environment Variable Usage in Codebase

For reference, here is where each env var is consumed in the existing codebase:

- `DATABASE_URL` — `src/lib/server/shared/db/client.ts` (Drizzle + postgres connection)
- `ANTHROPIC_API_KEY` — `src/lib/server/contexts/news/infrastructure/llm/anthropic-classifier.ts`
- `CRON_SECRET` — `src/routes/api/cron/daily/+server.ts` (validates `Authorization: Bearer` header)

All three are consumed via `$env/static/private` or `process.env` — server-side only.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
