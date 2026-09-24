# #14 — Demo: deepen the Vite showcase app — subtask tracking

Parent issue: **#14** · Repo: `Ansh-Sonuskare/fastf1` · Stack: Vite (`packages/demo`) + friendly hooks + `toPromise`/`initialData` SSR seam (ADR-002), **not** literal Next.js.

## Distributing #14 into subtasks

Issue #14's ACs, mapped onto the actual repo seam (Vite green baseline → deepen the web demo):

| AC (from #14) | Where it lands |
|---|---|
| Server fetches schedule on page load | `packages/demo/src/data/initial.ts` — `toPromise(getSchedule(year))` → `RaceTable` (SSR-style loader) |
| Client hydrates and shows latest race | `App.tsx` — `useF1Schedule`/`useF1Results` with `initialData` (hydration seam) |
| Shows current season schedule | Schedule panel via `useF1Schedule` |
| Shows latest race results | Latest-race panel via `useF1Results` |

## Subtasks (one thing at a time)

| # | Title | Status |
|---|---|---|
| #23 | SSR-style initial-data loader (`toPromise(getSchedule)` → RaceTable, `latestRound` derived) | **done** (loader shipped, commit `8450218c`; seam exported and consumed by #24/#25 — honesty note in ADR-002 rollout) |
| #24 | Current Season Schedule panel (`useF1Schedule` + initialData) | **done** (SchedulePanel renders all 24 real 2025 rounds; `main.tsx` awaits `loadInitialData()` before `createRoot().render` so the panel has data on first paint; verified in a real browser at commit `791c8ae`, screenshot `evidence/lane-a/v3/05-speed-chart-lap1.png`) |
| #25 | Latest Race Results panel (`useF1Results` + initialData) | **done** (ResultsPanel renders all 20 real finishers for the round with position/driver/constructor/time/points; fixed at `791c8ae` after commits `299a41f`/`f7f0674` shipped it rendering one row of dashes — `useF1Results` resolves `Race[]`, the finishers are on `Races[0].Results`, not the top-level array; verified in a real browser, screenshot `evidence/lane-a/v3/02-results.png`) |

Each pushed green (build + test + lint) before starting the next.

## Additional fixes applied

- **DRIVERS table** (App.tsx): corrected driver codes (AGR → ALB), names (BEA, DOO, STR), and numbers to match real grid
- **latestRound calculation** (initial.ts): changed from max round in schedule to latest round with date ≤ today (ensures results exist)
- **Type safety**: added `@types/react` and `@types/react-dom`, added typecheck script to demo package.json
- **`loadInitialData` seam restored** (`main.tsx`, commit `791c8ae`): a prior commit on this branch (`049bbeb`) deleted the seam entirely. `useAsyncResource` (`packages/react/src/hooks.ts`) only reads `initialData` on first render and skips its own fetch effect once it is set, so data loaded in a post-mount effect is never picked up. `main.tsx` now awaits `loadInitialData()` before `createRoot().render`.
- **Speed chart x-axis fixed** (App.tsx, commit `791c8ae`): seconds were computed as `index * 0.27` over the merged two-driver array, so a driver with fewer surviving samples (after upstream OpenF1 429s) drew only a stub near the origin. Seconds are now elapsed time since that driver's own first sample.

## Honesty note

Two earlier commits on this branch (`299a41f`, `f7f0674`, `049bbeb`) were reported as working without a passing browser check. They were not: the results panel rendered one row of dashes, and the `initialData` seam was dropped outright. Commit `791c8ae` is the first commit on this branch verified against a real browser session (screenshots and network/console logs in `/home/teak/code/fastf1-autopilot/evidence/lane-a/v3/`). The verify-fastf1-demo skill's `shot:` step (fixed 1100x900 viewport, full-page screenshot) can blank or truncate the speed chart's SVG when it sits below the fold; that is a screenshot-capture artifact of the skill, not a demo bug — confirmed by re-capturing the same settled page state at a taller viewport (`05-speed-chart-lap1.png`, `06-speed-chart-fastest-laps.png`) and by reading the live SVG path data directly, both showing complete, correct traces.

## ADR divergence being executed (documented, not Next.js)

#14's original AC said "Next.js showcase app", but ADR-002 records the demo diverges: it's a
**Vite** app with an SSR-style `initialData` seam (SSR/SSG-flavored page load → hydrate), not
literal Next.js. This rollout executes that documented divergence — I'm filing the divergence
note against #14 as part of this work, and this file is the tracking record.

## Tooling: Playwright MCP (for later demo E2E)

Added repo-scoped `opencode.json` (root), not touching the global mcp block:

- server: `playwright.mcp` via `@playwright/mcp` (local), enabled, headless-ready
- used to browser-test the deepened demo once subtasks ~#25 are in (E2E: load schedule → shows current season; load results → shows latest race)
- per the rest-of-session note: save config → **restart opencode** so the server loads
