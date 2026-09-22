# ADR-001: Effect-TS Migration

**Status**: Accepted  
**Date**: 2026-07-04  
**Drivers**: Type safety, composability, testability, unified error handling

## Context

The fastf1 codebase uses Zod for runtime validation, a custom class-based HTTP client with `quick-lru` caching, and `async/await` with thrown errors. This works but lacks:

- Typed error channels (errors are implicit `throws`)
- Composable retry/timeout/circuit-breaker patterns
- First-class dependency injection
- Structured concurrency for future live-timing features

## Decision

Replace the current stack with Effect-TS:

| Concern | Before | After |
|---|---|---|
| Validation | Zod | `effect/Schema` (merged from `@effect/schema`) |
| HTTP client | `F1Client` class + `fetch` | `@effect/platform` `HttpClient` service |
| Caching | `quick-lru` | `effect/Cache` or service-scoped `Ref` |
| Errors | `class extends Error` + `throw` | `Schema.TaggedError` + `Effect.fail` |
| Async | `async/await` | `Effect.gen` / `Effect.fn` / `Effect.flatMap` |
| DI | Manual constructor args | `Context.Tag` + `Layer` |
| Scheduling | Manual setTimeout | `Schedule` / `Effect.timeout` |
| Testing | `vi.fn()` mocks | `@effect/vitest` + `Layer.provide` |
| Live timing (future) | N/A | `Stream` / `Hub` / `Socket` |

## Packages

- `effect` — core library (includes `Schema`, `Effect`, `Context`, `Layer`, `Cache`, etc.)
- `@effect/platform` — `HttpClient`, `HttpClientError`
- `@effect/platform-node` — Node.js runtime services
- `@effect/vitest` — Vitest integration (Phase 6)

`@effect/schema` is not used directly; `Schema` is imported from `effect/Schema`.

## Migration Strategy

Seven phases (see GitHub issue #22):

1. **Foundation** — install deps, configure build, document decisions
2. **Schemas** — replace Zod with `effect/Schema` (most mechanical step)
3. **Errors** — replace class hierarchy with `Schema.TaggedError`
4. **HTTP client** — convert `F1Client` to `Context.Tag` service
5. **API functions** — convert all `async` functions to `Effect.fn`
6. **React hooks** — update to consume Effect via `runPromise`
7. **Testing** — migrate to `@effect/vitest`
8. **Cleanup** — remove old deps and bridge code

## Consequences

- Learning curve for team members unfamiliar with Effect
- All public API signatures change from `Promise<T>` to `Effect<T, E, R>` 
- React hooks get a thin Effect-to-React bridge layer
- Build bundle includes `effect` (~50KB gzipped)
- Live-timing (WebSocket) will benefit from `Stream` and `Hub`
