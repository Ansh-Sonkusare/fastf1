# ADR-002: Effect-TS Migration Complete (Lessons Learned)

**Status**: Accepted
**Date**: 2026-09-22
**Drivers**: Close out phase 7 of issue #22 and record where reality diverged from the ADR-001 plan

## Context

ADR-001 planned a seven-phase migration (actually eight in its strategy list) from
Zod/class-based HTTP/`async/await` to Effect-TS. The migration has shipped and merged
onto `main`. This ADR records the concrete end state and the decisions where
implementation diverged from the ADR-001 table, so future work does not re-litigate
them and future readers do not treat the divergences as unresolved.

## Final State (per phase)

| Phase | Result |
|---|---|
| 0 Foundation | `effect`, `@effect/platform`, `@effect/platform-node` installed; `effect`/`@effect/*` in both packages' Vite externals; `.repos/` clones gitignored; ADR-001 written |
| 1 Schemas | Zero `zod` imports; all schemas use `effect/Schema`; decode via `Schema.decodeUnknown*` |
| 2 Errors | `Schema.TaggedError`: `F1ClientError`, `TimeoutError`, `RateLimitError` (canonical in `http/service.ts`; legacy `AbortError` kept in `http/effect-errors.ts`) |
| 3 HTTP client | `F1ClientService` `Context.Tag` + `F1ClientServiceLive` `Layer`; `Effect.tryPromise` over `fetch`; `Effect.timeoutFail(10s)` with `AbortController`; `Effect.retry(Schedule.exponential(1s) |> Schedule.jittered |> Schedule.recurs(2))` |
| 4 API functions | No `async` remaining in `api/` or `http/`; all APIs are `Effect.fn`/`Effect.gen` returning `Effect<A, ClientError, F1ClientService>` |
| 5 React hooks | `useF1Schedule`, `useF1Results`, `useRaceHooks` consume Effects via `toPromise`; `useAsyncResource` owns initial-data/loading/error/cancellation |
| 6 Testing | See divergence below |
| 7 Cleanup | `zod`, `quick-lru` removed from all `package.json`s; old `http/errors.ts` deleted; Vite externals updated; build + lint + 119 tests pass |

## Divergences from ADR-001

1. **HTTP client is a thin Effect wrapper over native `fetch`**, not `@effect/platform HttpClient`.
   `Effect.tryPromise` + `Effect.timeoutFail` + `Effect.retry` give the same guarantees with
   less type plumbing and no `Fetch`/`HttpClient` indirection. `@effect/platform` remains for
   Node services and future streaming.

2. **No replacement cache.** `quick-lru` was dropped without adopting `effect/Cache`.
   OpenF1 data is time-sensitive and the retry schedule absorbs transient failures. Cache is
   deferred until a measured need exists, per PRD #20's "avoid premature seams".

3. **Testing kept `vi.fn()` module mocks + `toPromise`, not `@effect/vitest` + `Layer.provide`.**
   The `openf1` data-access module is mocked per test file; `F1ClientServiceLive` is exercised
   directly in `http/client.test.ts` against a stubbed `global.fetch`. This follows PRD #20's
   "tests should stay at existing public interfaces" and avoids a rewrite whose value is
   mostly ceremonial. `@effect/vitest` remains available for new Effect-centric suites.

4. **Schema decode failures die via a deliberately named `parseOrDie`** (a plain `throw`,
   captured by Effect as a defect) rather than a `Effect.fail` chain at every call site.
   The name makes the contract explicit; callers that want a typed decode error can use
   `Schema.decodeUnknown*` directly.

5. **Driver/resolution smarts live in `race-session.ts`** (ADR driven by issue #21): meeting,
   session, driver-number, and telemetry lap-window resolution are concentrated there, and
   the friendly API delegates to it.

## Lessons

- `Effect.fn` + `Effect.gen` made the API layer uniformly typed with almost no boilerplate;
  the tagged-error union (`ClientError`) gives callers a real `catch` surface for
  rate-limit/timeout handling.
- Keeping public functions as `Effect<A, E, R>` and providing the live service only at the
  boundary (`toPromise`) kept both tests and React hooks simple.
- The native-fetch wrapper was the highest-leverage simplification; a second `HttpClient`
  abstraction would have been a seam with only one implementation.

## Consequences

- Public signatures changed from `Promise<T>` to `Effect`; the React bridge absorbs the change.
- No open migration debt remains from #22 beyond this record.