# F1-TS Context

## Domain Terms

- **f1-core** — core library: HTTP client, cache, API functions, Zod schemas
- **f1-react** — React hooks with SSR hydration
- **Ergast API** — F1 historical data API (jolpica-f1 replacement)
- **Effect Schema** — runtime validation + type inference (replacing Zod)
- **Effect Cache** — composable caching (replacing `quick-lru`)
- **SSR hydration** — server prefetch → client hydration pattern

## Architecture

- **Monorepo**: pnpm workspaces + Turbo for caching
- **Packages**: `f1-core`, `f1-react`
- **Build**: Vite (library mode)
- **Testing**: Vitest + `@effect/vitest`
- **Linting**: Biome
- **Exports**: Named exports (`import { getSchedule } from 'f1-core'`)

## Data Source

- jolpica-f1 API: `https://api.jolpi.ca/ergast/f1/`
- OpenF1 API: `https://api.openf1.org/v1/`
- Live timing: deferred (Phase 2)

## Tech Stack

- `effect` — core library (Schema, Effect, Context, Layer, Cache)
- `@effect/platform` — HttpClient, HttpClientError
- `@effect/platform-node` — Node.js runtime services
- No pandas equivalent — plain TS types