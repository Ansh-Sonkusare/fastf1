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
| #23 | SSR-style initial-data loader (`toPromise(getSchedule)` → RaceTable, `latestRound` derived) | **done** (loader shipped, commit `84521c8`; seam exported and consumed by #24/#25 — see Honesty note below) |
| #24 | Current Season Schedule panel (`useF1Schedule` + initialData) | **done** (SchedulePanel renders all 24 real 2025 rounds; `main.tsx` races `loadInitialData()` against a timeout before `createRoot().render` so the panel usually has data on first paint; verified in a real browser at this branch's final commit, PLACEHOLDER_SHA) |
| #25 | Latest Race Results panel (`useF1Results` + initialData) | **done** (ResultsPanel renders all 20 real finishers for the round with position/driver/constructor/time/points, including lapped and retired cars; verified in a real browser at this branch's final commit, PLACEHOLDER_SHA) |

Each pushed green (build + test + lint) before starting the next.

## Additional fixes applied

- **`loadInitialData` seam restored** (`main.tsx`): a prior commit on this branch deleted the seam entirely. `useAsyncResource` (`packages/react/src/hooks.ts`) only reads `initialData` on first render and skips its own fetch effect once it is set, so data loaded in a post-mount effect is never picked up. `main.tsx` now races `loadInitialData()` against a 4s timeout and renders without it on timeout or failure (logging the error), since the hooks fetch their own data client-side either way.
- **`latestRound` calculation** (`initial.ts`): the "latest round with date ≤ today" logic is now one exported function (`latestRoundWithDate`), used both by the initial loader and by `App.tsx` when `initialData` didn't load in time, instead of a hardcoded fallback round.
- **Driver picker built from loaded results, not a hand-kept table**: the old `DRIVERS` array (with duplicated colors and at least one wrong name) is gone. Driver options are derived from each result's `Driver.code`/`Driver.permanentNumber`/name, with a distinct color per team (a lightened shade for the second driver on the same team). Telemetry and fastest-lap calls pass the driver's number, not code, because `@f1/core`'s `DRIVER_CODES` map has two wrong/colliding entries (see Open questions).
- **Lapped-car results**: Jolpica reports lapped classified finishers with a status like `"Lapped"` and no lap-gap text. The Time/Status column now shows `"+N Lap(s)"` (leader laps minus that driver's laps) for any non-`"Finished"` status where laps are behind, and the raw status text for genuine retirements (accidents, mechanical failures, etc).
- **Stale telemetry on error**: `useAsyncResource` (in `@f1/react`) keeps the last successful `data` around after a later request for the same hook errors. `App.tsx` now destructures `error` for each driver's telemetry and excludes that driver from the chart and point count when its current request has failed, instead of silently redrawing the previous lap's trace.
- **Chart draw-in animation disabled**: Recharts animates each `<Line>`'s reveal by default, which made screenshots taken before the animation settled look like a truncated or empty trace. `isAnimationActive={false}` is now set on both lines, and the chart's derived data is `useMemo`'d on `[t1, t2, driver1, driver2]`.
- **Type safety**: added `@types/react`/`@types/react-dom` and a typecheck script to `packages/demo/package.json`; added `effect` as a demo devDependency (type-only) so the results-race type can be derived from `@f1/core`'s `getRaceResults` directly instead of a hand-declared shape.

## Honesty note

Three earlier commits on this branch were reported as working without a passing browser check. They were not: the results panel rendered one row of dashes, and a later commit dropped the `initialData` seam outright. A first browser-verified commit fixed those two bugs, but a follow-up review (three-model interrogation of this PR) found the fix was still incomplete: the speed chart's short-looking traces were Recharts' draw-in animation caught mid-reveal (not a screenshot-capture artifact, as an earlier version of this note incorrectly claimed), a "Lap 48" screenshot was actually showing lap 1's stale trace because a failed request doesn't clear old data, and the driver picker was a hand-kept table with wrong/duplicate entries. All of those are fixed on this branch's final commit, verified against a real browser session with the chart's animation settled and one run forcing a driver's telemetry request to fail to confirm the error path (evidence kept outside this repository, referenced from the PR description).

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
