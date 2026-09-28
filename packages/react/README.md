# @teakmirror113/f1-react

React hooks for Formula 1 data from [OpenF1](https://openf1.org), built on [`@teakmirror113/f1-core`](https://www.npmjs.com/package/@teakmirror113/f1-core). Works with React 18 and 19.

```bash
npm install @teakmirror113/f1-react
```

## Usage

```tsx
import { useRaceStints, useRaceTelemetry } from "@teakmirror113/f1-react";

function Stints() {
  const { data, isLoading, error } = useRaceStints(2025, "Abu Dhabi", "VER");
  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>{error.message}</p>;
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

Every hook returns `{ data, isLoading, error }` and refetches when its arguments change.

| Hook | Data |
|---|---|
| `useF1Schedule(year)` | The season schedule |
| `useF1Results(year, round)` | Race results |
| `useRaceStints(year, raceName, driver?)` | Tyre stints |
| `useRacePitStops(year, raceName, driver?)` | Pit stops |
| `useRaceWeather(year, raceName, session?)` | Weather samples |
| `useRaceTelemetry(year, raceName, driver)` | Speed, throttle, brake, RPM and gear |
| `useFastestLap(year, raceName, driver)` | The fastest lap |
| `useAsyncResource(load, initialData?)` | Any promise, with the same `{ data, isLoading, error }` shape |

Pass `{ initialData }` to hydrate from a server-side fetch.

[Undercut](https://github.com/Ansh-Sonkusare/undercut), a race-strategy terminal, is built on these hooks.

Unofficial and not associated with Formula 1. MIT licensed.
