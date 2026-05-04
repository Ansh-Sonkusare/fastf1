# F1-TS Context

## Domain Terms

- **f1-core** — core library: HTTP client, cache, API functions, Zod schemas
- **f1-react** — React hooks with SSR hydration
- **Ergast API** — F1 historical data API (jolpica-f1 replacement)
- **Zod schemas** — runtime validation + type inference
- **LRU cache** — in-memory least-recently-used cache
- **SSR hydration** — server prefetch → client hydration pattern

## Architecture

- **Monorepo**: pnpm workspaces + Turbo for caching
- **Packages**: `f1-core`, `f1-react`
- **Build**: Vite (library mode)
- **Testing**: Vitest
- **Linting**: Biome
- **Exports**: Named exports (`import { getSchedule } from 'f1-core'`)

## Data Source

- jolpica-f1 API: `https://api.jolpi.ca/ergast/f1/`
- Live timing: deferred (Phase 2)

## Dependencies

- `zod` — runtime validation
- `quick-lru` or `lru-cache` — caching
- No pandas equivalent — plain TS types