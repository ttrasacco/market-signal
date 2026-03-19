---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
    ['_bmad-output/planning-artifacts/prd.md', '_bmad-output/planning-artifacts/architecture.md']
---

# UX Design Specification market-signal

**Author:** Thomas
**Date:** 2026-03-19

---

<!-- UX design content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

### Project Vision

market-signal is a personal financial intelligence tool for an individual investor (Thomas). It ingests daily financial news, classifies each article via LLM, and computes a decay-weighted conviction score per economic sector. The core insight is the distinction between **STRUCTURAL** events (lasting impact, low λ decay) and **PUNCTUAL** events (noise, high λ decay). This is not a sentiment aggregator — it is a conviction signal tool designed to surface medium-to-long-term sector trends to inform capital allocation and exit decisions.

### Target Users

Single user — Thomas, individual investor, personal deployment. Opens the dashboard on a weekday morning (desktop or mobile, Chrome only), scans sector overview in ~30 seconds, and makes allocation decisions based on sustained directional trends rather than yesterday's headlines. No multi-tenancy, no alerts, no social features.

### Key Design Challenges

1. **Legibility of an abstract score**: The decay-weighted score is not a familiar percentage. The UI must communicate _direction_ and _conviction strength_ without requiring the user to understand the underlying exponential formula.
2. **Warm-up period opacity**: For the first ~30 days, scores exist but are not yet reliable. The UI must convey signal maturity without overwhelming the interface.
3. **Information density on mobile**: ~10 sectors with scores and trend indicators must remain scannable and unambiguous on small screens.

### Design Opportunities

1. **Score as "temperature"**: A strong visual metaphor (color gradient, score bar) can replace the need to understand the math — users read conviction at a glance.
2. **Deliberate calm**: Unlike Bloomberg terminals, the UI can be intentionally minimal and reassuring — signaling conviction without inducing anxiety.
3. **STRUCTURAL vs PUNCTUAL vocabulary** (Phase 2): A distinctive visual language for impact type can become a signature UX pattern unique to market-signal.

### Dashboard Layout Decisions

| Topic        | Decision                                                                           |
| ------------ | ---------------------------------------------------------------------------------- |
| Structure    | Top 3 highlight (bullish) + Bottom 3 highlight (bearish) + full sector table below |
| Threshold    | Top 3 from sectors with score > 0 only · Bottom 3 from sectors with score < 0 only |
| Order        | By descending score within each section                                            |
| Intensity    | Color + score bar                                                                  |
| Empty zone   | Contextual message (e.g. "No significant sectoral pressure detected")              |
| N            | 3                                                                                  |
| Neutral zone | Ignored in MVP                                                                     |

## Core User Experience

### Defining Experience

The core action is pure reading — open, scan, leave. Thomas spends ~30 seconds on the dashboard each morning. There is no interaction to learn, no navigation to master. The value is in the speed of comprehension: conviction visible at a glance, no news reading required.

### Platform Strategy

- Web app (SvelteKit SSR) · Chrome only · No PWA
- Responsive: desktop and mobile browser
- Touch and mouse/keyboard supported
- No offline functionality required
- Scores pre-computed — zero runtime calculation, no polling

### Effortless Interactions

- Dashboard opens immediately to a readable state — no loading states blocking comprehension
- Sector cards communicate direction and strength without requiring knowledge of the decay formula
- Full sector list visible by default via natural scroll — no toggle required
- Mobile: same content, reduced card density (less info per card)
- No navigation in MVP — strictly read-only

### Critical Success Moments

- **First scan**: User opens dashboard and immediately reads which sectors have conviction — no explanation needed
- **Trust building**: After ~30 days, score movements feel coherent with observable macro reality
- **Low-signal detection**: User notices a sector with a red reliability icon and correctly interprets it as insufficient data, not a neutral signal

### Experience Principles

1. **Zero friction** — read-only, nothing to learn, nothing to configure
2. **Signal before noise** — low-reliability sectors are visually and structurally deprioritized
3. **Deliberate calm** — no freshness indicators, no anxiety-inducing status messages
4. **Mobile-first density** — same information hierarchy, reduced visual weight on small screens

### Reliability System

Each sector card displays a reliability icon whose color reflects the worst of 4 criteria:

| Criterion                     | Red      | Orange      | Green       |
| ----------------------------- | -------- | ----------- | ----------- |
| Total articles analyzed       | < 5      | 5–20        | > 20        |
| Recent articles (last 7 days) | < 2      | 2–5         | > 5         |
| Source diversity              | 1 source | 2–3 sources | > 3 sources |
| PUNCTUAL proportion           | > 70%    | 35–70%      | 0–35%       |

**Behavior:**

- Icon color = worst criterion color across all 4
- Desktop: hover → tooltip listing all criteria with individual colors
- Mobile: icon color only, no tooltip
- Low-reliability sectors (red icon): excluded from top/bottom 3 highlights, relegated to bottom of full sector table
- Icon shape: decided at implementation
- Reliability detail display: **dropdown** on icon click/hover (desktop only) — not a tooltip
- Mobile: icon color only, no dropdown

## Desired Emotional Response

### Primary Emotional Goals

- **Confidence**: scores feel trustworthy and coherent with observable macro reality
- **Satisfaction**: the tool delivers a clear read in 30 seconds — job done
- **Calm**: no urgency, no performance anxiety, no information overload

### Emotional Journey Mapping

| Moment                            | Target emotion                             |
| --------------------------------- | ------------------------------------------ |
| Daily scan — scores coherent      | Confidence + satisfaction                  |
| Dashboard stable, no movement     | Calm — no alarm signal                     |
| Pipeline silent (no score change) | Neutral/sober — user checks logs if needed |
| After 30-day warm-up              | Satisfaction ("it matches reality")        |

### Emotions to Avoid

- **Anxiety**: no stock tickers, no blinking red/green Bloomberg-style indicators
- **Cognitive overload**: no granular indices, no price data, strictly macro
- **Dependency or pressure**: no buy/sell recommendations — the tool informs, it does not prescribe

### Design Implications

- **Confidence → Reliability system**: the multi-criteria reliability icon lets the user know when to trust a score and when to discount it
- **Calm → Minimal visual language**: color communicates direction, not urgency — no flashing, no aggressive contrast
- **Satisfaction → Zero friction**: the dashboard delivers its value immediately on load, no interaction required
- **No anxiety → No staleness indicators**: if the pipeline is silent, the dashboard stays quiet — no "last updated" warnings

### Scope Notes

- No geographic dimension on sector cards in MVP — scores reflect available RSS feed coverage (likely international/US-biased)
- Region-based sector scoring is a Phase 3 consideration
- No stock indices, no price data, no investment recommendations — ever

### Emotional Design Principles

1. **Inform, never prescribe** — the tool shows what is happening, not what to do
2. **Trust through restraint** — fewer elements on screen = more credibility per element
3. **Calm is a feature** — the absence of urgency signals is intentional, not an omission

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

**Trade Republic**

- Minimal, calm dashboard with dark background and very discrete color accents (green/red)
- Clear visual hierarchy: essential information large, details small
- Generous whitespace — each element has room to breathe
- Positive/negative performance communicated via color + number, never via blinking or urgency cues
- Mobile-first by design — the reference for calm financial UX

**GitLab**

- High information density organized into clearly titled sections
- Status badges (CI pipeline, issues) use simple colored indicators (green/orange/red) — exactly the pattern chosen for the reliability icon
- Ordered lists with secondary meta-information in attenuated grey
- Dense without anxiety because visual hierarchy is consistently respected

### Transferable UX Patterns

| Pattern                                  | Source         | Application in market-signal    |
| ---------------------------------------- | -------------- | ------------------------------- |
| Dark background + discrete color accents | Trade Republic | Dashboard color palette         |
| Primary value large, meta small          | Trade Republic | Sector cards                    |
| Colored status badges (green/orange/red) | GitLab         | Reliability icon system         |
| Clearly titled sections                  | GitLab         | Highlights vs full sector table |
| Generous spacing around elements         | Trade Republic | Mobile card density             |

### Anti-Patterns to Avoid

- Real-time tickers and indices (Bloomberg) — creates anxiety, not our signal
- Aggressive bright colors for performance (Robinhood) — conflicts with calm emotional goal
- Embedded price charts everywhere — not our data model
- Push notifications / visual alerts — out of scope, contradicts deliberate calm

### Design Inspiration Strategy

**Adopt:**

- Trade Republic's visual restraint and dark palette — directly supports the calm, confident emotional goal
- GitLab's colored status badge system — maps directly to the reliability indicator pattern

**Adapt:**

- Trade Republic's card layout → simplify further for read-only context (no tap targets needed in MVP)
- GitLab's section structure → apply to highlight zones (bullish/bearish) + full table separation

**Avoid:**

- Any pattern that implies urgency, real-time reactivity, or actionable recommendations

## Core User Experience — Defining Experience

### 2.1 Defining Experience

> _"Open the dashboard and read in 30 seconds where sectoral conviction is building — and where it is fading."_

The product is a **read**, not an interaction. Its value is instant directional clarity: the user closes the tab knowing something they didn't before, without having clicked anything. The mental model is weather — open, scan, leave.

**Critical distinction**: market-signal does not display the current state of a sector. It displays its **evolutionary trend** — the vector, not the position. A sector that has been rising for 3 weeks with consistent structural news is fundamentally different from one that spiked yesterday on a single punctual event.

### 2.2 User Mental Model

- User arrives expecting to answer: "where is conviction building, and where is it eroding?"
- The PUNCTUAL/STRUCTURAL distinction maps to investor intuition: "is this noise or does it change the thesis?"
- Current solutions (Bloomberg, sentiment APIs) show raw sentiment without temporal modeling — market-signal surfaces sustained directional pressure instead
- No numbers needed — direction and intensity are sufficient for the morning scan

### 2.3 Success Criteria

- User reads the dashboard orientation in under 30 seconds
- The Ripple Cast visual is immediately interpretable without explanation
- After ~30 days, score trends feel coherent with observable macro reality
- The user understands they are reading a trend, not a snapshot

### 2.4 Novel UX Patterns

**Ripple Cast** — a new visual pattern for encoding two temporal dimensions on a single card:

- **Inner ring** = PUNCTUAL signal (current state, fast decay)
- **Outer ripples** = STRUCTURAL signal (forward projection, slow decay, 7–30 day horizon)
- Each dimension carries an independent color (green / orange / red)
- The combination of two colors encodes 9 distinct market states, each with a predefined narrative label

This pattern is novel in financial UX — no existing tool encodes PUNCTUAL vs STRUCTURAL signals visually. It is auto-explicative: the inner/outer metaphor maps naturally to "now vs. later."

### 2.5 Experience Mechanics

**Initiation:** User opens the dashboard (no login, no configuration)

**Interaction:** Pure reading — no clicks required in MVP

- Highlights zone: top 3 bullish + bottom 3 bearish (reliable sectors only)
- Each card: sector name + Ripple Cast visual + narrative label
- Full sector table below: all sectors ordered by score, low-reliability sectors at bottom with dimmed opacity + reliability icon

**Feedback:** The Ripple Cast color combination communicates state instantly — no tooltip needed for the core read

**Completion:** User closes tab with a directional read on sector conviction

### 2.6 Narrative Label System

Static labels derived from PUNCTUAL color × STRUCTURAL color — no LLM required at display time:

| Current (PUNCTUAL) | Previsionnel (STRUCTURAL) | Label                                |
| ------------------ | ------------------------- | ------------------------------------ |
| 🟢 Green           | 🟢 Green                  | "Confirmed momentum"                 |
| 🟢 Green           | 🟠 Orange                 | "Healthy · caution ahead"            |
| 🟢 Green           | 🔴 Red                    | "Healthy · structural deterioration" |
| 🟠 Orange          | 🟢 Green                  | "Turbulence · rebound expected"      |
| 🟠 Orange          | 🟠 Orange                 | "Mixed signal"                       |
| 🟠 Orange          | 🔴 Red                    | "Growing pressure"                   |
| 🔴 Red             | 🟢 Green                  | "Current crisis · rebound expected"  |
| 🔴 Red             | 🟠 Orange                 | "Crisis · uncertain stabilization"   |
| 🔴 Red             | 🔴 Red                    | "Widespread deterioration"           |

## Visual Design Foundation

### Color System

| Role             | Token                      | Hex       | Usage                               |
| ---------------- | -------------------------- | --------- | ----------------------------------- |
| Background       | `--color-bg`               | `#0F0F11` | Main page background                |
| Surface          | `--color-surface`          | `#1A1A1F` | Sector cards                        |
| Surface elevated | `--color-surface-elevated` | `#242429` | Hover states / reliability dropdown |
| Border           | `--color-border`           | `#2E2E35` | Card outlines, dividers             |
| Text primary     | `--color-text-primary`     | `#F0F0F2` | Sector names, headings              |
| Text secondary   | `--color-text-secondary`   | `#8A8A96` | Narrative labels, meta              |
| Signal green     | `--color-green`            | `#22C55E` | Bullish / reliable                  |
| Signal orange    | `--color-orange`           | `#F59E0B` | Mixed / caution                     |
| Signal red       | `--color-red`              | `#EF4444` | Bearish / unreliable                |

Color roles are semantic — green/orange/red are used consistently across Ripple Cast rings, reliability icons, and score bars. No other accent colors introduced in MVP.

### Typography System

- **Font family**: `Inter`, with `system-ui` fallback — clean, neutral, optimized for screen readability
- **No serif or display fonts** — not a financial magazine, a signal tool
- **Type hierarchy**:
    - Sector name: `500` weight, `16px`
    - Narrative label: `400` weight, `12px`, uppercase, text-secondary color
    - Section headings (Bullish / Bearish): `600` weight, `13px`, uppercase, text-secondary
    - Reliability dropdown: `400` weight, `12px`
- **No decorative typography** — legibility over personality

### Spacing & Layout Foundation

- **Base unit**: `4px` — all spacing in multiples of 4, primarily multiples of 8
- **Card padding**: `16px` desktop · `12px` mobile
- **Card gap**: `12px`
- **Highlights ↔ full table divider**: `32px` gap + subtle `--color-border` horizontal rule
- **Page max-width**: `640px` centered — optimized for mobile-first, comfortable on desktop
- **Grid**: single column on mobile · 2-column option for highlights on desktop (TBD at implementation)

### Accessibility Considerations

- All text/background color combinations target WCAG AA contrast ratio (4.5:1 minimum)
- Signal colors (green/orange/red) never used as the sole differentiator — always paired with position (inner vs. outer ring) or label text
- Reliability dropdown accessible via keyboard on desktop
- No animations that could cause issues — transitions kept to a minimum

## Design System Foundation

### Design System Choice

**Tailwind CSS + shadcn-svelte (Option B — Themeable System)**

### Rationale for Selection

- **Solo developer context**: pre-built accessible components (cards, badges, dropdowns) accelerate development without sacrificing control
- **Custom dark/minimal aesthetic**: Tailwind utility-first approach allows full visual control to achieve a Trade Republic-inspired look — no opinionated theme to fight against
- **Component needs already identified**: dropdown (reliability detail), badge (reliability icon), cards (sector display) are all available as shadcn-svelte primitives ready to customize
- **Ownership model**: shadcn-svelte copies components directly into the project — they are owned and modifiable, not locked behind a library version
- **SvelteKit ecosystem fit**: shadcn-svelte is the dominant component approach in the current Svelte ecosystem

### Implementation Approach

- Install Tailwind CSS as the style foundation
- Add shadcn-svelte for pre-built accessible primitives
- Customize component tokens (colors, radius, spacing) to match the dark/minimal visual direction
- Build sector card and reliability icon as custom components on top of these primitives

### Customization Strategy

- Dark background palette inspired by Trade Republic — define as Tailwind CSS custom colors/design tokens
- Color system: green (bullish/reliable) · red (bearish/unreliable) · orange (warning/moderate) — used consistently across score bars and reliability badges
- Typography: clean, minimal — prioritize legibility of score values over decorative type choices
- No animations or transitions beyond minimal hover states — calm is a feature
