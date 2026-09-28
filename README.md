# F1 Data Package

TypeScript package for accessing F1 race data from OpenF1 API.

## Built with it: Undercut

[**Undercut**](https://github.com/Ansh-Sonkusare/undercut) is a race-strategy terminal built on this package. It replays any session lap by lap from real OpenF1 data, recommends a pit call with its confidence, and ties every chart to one replay cursor.

[![Undercut desk view: timing tower, pit call, track map and lap compare](docs/screenshots/lap-compare.png)](https://github.com/Ansh-Sonkusare/undercut)

## Install

```bash
npm install @teakmirror113/f1-core    # the data client
npm install @teakmirror113/f1-react   # React hooks, for React 18 or 19
```

On npm: [`@teakmirror113/f1-core`](https://www.npmjs.com/package/@teakmirror113/f1-core) · [`@teakmirror113/f1-react`](https://www.npmjs.com/package/@teakmirror113/f1-react)

## Quick Start (Friendly API)

Use year + race name + driver code, no session keys needed. Every call is an [Effect](https://effect.website); `toPromise` runs one as a plain promise.

```typescript
import {
  getRace,
  getSession,
  getSessionLaps,
  getRaceStints,
  getRacePitStops,
  getRaceWeather,
  getRaceTelemetry,
  toPromise,
} from "@teakmirror113/f1-core";

// Race and session by name (the session defaults to the race)
const race = await toPromise(getRace({ year: 2025, name: "Abu Dhabi" }));
const session = await toPromise(getSession({ year: 2025, raceName: "Abu Dhabi" }));

// Laps for a driver
const laps = await toPromise(getSessionLaps({ year: 2025, raceName: "Abu Dhabi", driver: "VER" }));

// Stints, pit stops, weather, telemetry
const stints = await toPromise(getRaceStints({ year: 2025, raceName: "Abu Dhabi", driver: "VER" }));
const pits = await toPromise(getRacePitStops({ year: 2025, raceName: "Abu Dhabi", driver: "VER" }));
const weather = await toPromise(getRaceWeather({ year: 2025, raceName: "Abu Dhabi" }));
const telemetry = await toPromise(getRaceTelemetry({ year: 2025, raceName: "Abu Dhabi", driver: "VER" }));
```

## Available APIs

### Friendly API (Recommended)

Pass year + one of (raceName OR round) OR sessionKey:

- `getRace({ year, name?, round? })` - Find race by year + name or round
- `getSession({ year, raceName?, round?, session? })` - Find session (pass sessionKey to skip lookup)
- `getSessionLaps({ year, raceName?, sessionKey?, driver?, lap? })` - Lap times
- `getRaceStints({ year, raceName?, sessionKey?, driver? })` - Tyre stint data
- `getRacePitStops({ year, raceName?, sessionKey?, driver? })` - Pit stop data
- `getRaceWeather({ year, raceName?, sessionKey? })` - Weather conditions
- `getRaceTelemetry({ year, raceName?, sessionKey?, driver? })` - Speed, throttle, brake, RPM, gear

### Low-level API (requires session key)
- `getMeetings(year)` - List all meetings for a year
- `getSessions(meetingKey)` - Sessions in a meeting
- `getDrivers(sessionKey)` - Drivers in a session
- `getOpenF1Laps(sessionKey, driverNumber)` - Lap times
- `getStints(sessionKey, driverNumber)` - Stint data
- `getOpenF1PitStops(sessionKey, driverNumber)` - Pit stop data
- `getCarData(sessionKey, driverNumber)` - Speed, throttle, brake, RPM, gear
- `getPosition(sessionKey, driverNumber)` - Position data
- `getLocation(sessionKey, driverNumber)` - X, Y, Z coordinates
- `getWeather(sessionKey)` - Weather conditions
- `getRaceControl(sessionKey)` - Race control messages
- `getTeamRadio(sessionKey)` - Team radio messages
- `getOvertakes(sessionKey)` - Overtake data
- `getSessionResult(sessionKey)` - Session results
- `getStartingGrid(sessionKey)` - Starting grid
- `getIntervals(sessionKey)` - Interval data

## React Hooks

```typescript
import { 
  useRaceStints,
  useRacePitStops,
  useRaceWeather,
  useRaceTelemetry,
} from "@teakmirror113/f1-react";

// Friendly hooks - no session keys needed
const { data: stints, isLoading } = useRaceStints(2026, "Miami", "VER");
const { data: pits } = useRacePitStops(2026, "Miami", "VER");
const { data: weather } = useRaceWeather(2026, "Miami");
const { data: telemetry } = useRaceTelemetry(2026, "Miami", "VER");
```

## Examples

```bash
# Race pace analysis
pnpm demo
```

## Develop

```bash
pnpm install
pnpm build
pnpm test
```

## Architecture

```
packages/
├── core/           # Main API package
│   ├── src/api/    # OpenF1 API functions
│   └── src/schemas/ # Zod schemas
└── react/          # React bindings
```