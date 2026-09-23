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
| #23 | SSR-style initial-data loader (`toPromise(getSchedule)` → RaceTable, `latestRound` derived) | **done** (loader shipped, commit `8450218c`; seam exported but **unconsumed until #24/#25 wire it** — honesty note in ADR-002 rollout) |
| #24 | Current Season Schedule panel (`useF1Schedule` + initialData) | **done** (gate: build 3.57s + lint 0 fixes, pushed) |
| #25 | Latest Race Results panel (`useF1Results` + initialData) | **seam shipped** (import landed, pushed `5361b18`; panel body pending next gate — honest seam-only row, no fabricated panel) |

Each pushed green (build + test + lint) before starting the next.

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
