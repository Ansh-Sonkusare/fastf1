# F1 Data Package

TypeScript package for accessing F1 race data from OpenF1 API.

## Built with it: Undercut

[**Undercut**](https://github.com/Ansh-Sonkusare/undercut) is a race-strategy terminal built on this package. It replays any session lap by lap from real OpenF1 data, recommends a pit call with its confidence, and ties every chart to one replay cursor.

[![Undercut desk view: timing tower, pit call, track map and lap compare](docs/screenshots/lap-compare.png)](https://github.com/Ansh-Sonkusare/undercut)

## Install

```bash
pnpm install
pnpm build
```

## Use it in your project

The packages are not on npm yet. Install them from this repo with pnpm, which clones it and builds each package on install:

```json
{
  "dependencies": {
    "@f1/core": "github:Ansh-Sonkusare/fastf1#path:/packages/core",
    "@f1/react": "github:Ansh-Sonkusare/fastf1#path:/packages/react"
  },
  "pnpm": {
    "onlyBuiltDependencies": ["@f1/core", "@f1/react"]
  }
}
```

`onlyBuiltDependencies` lets pnpm run the build for these two packages. `@f1/react` needs `react` 18 or 19 and `@f1/core` alongside it.

## Quick Start (Friendly API)

Use year + race name + driver code - no session keys needed:

```typescript
import { 
  getRace,
  getSession,
  getLaps,
  getRaceStints,
  getRacePitStops,
  getRaceWeather,
  getRaceTelemetry,
} from "@f1/core";

// Get race by name
const race = await getRace({ year: 2026, name: "Miami" });

// Get session (defaults to first session)
const session = await getSession({ year: 2026, raceName: "Miami" });

// Get laps for a driver
const laps = await getLaps({ year: 2026, raceName: "Miami", driver: "VER" });

// Get stints, pit stops, weather, telemetry
const stints = await getRaceStints({ year: 2026, raceName: "Miami", driver: "VER" });
const pits = await getRacePitStops({ year: 2026, raceName: "Miami", driver: "VER" });
const weather = await getRaceWeather({ year: 2026, raceName: "Miami" });
const telemetry = await getRaceTelemetry({ year: 2026, raceName: "Miami", driver: "VER" });
```

## Available APIs

### Friendly API (Recommended)

Pass year + one of (raceName OR round) OR sessionKey:

- `getRace({ year, name?, round? })` - Find race by year + name or round
- `getSession({ year, raceName?, round?, session? })` - Find session (pass sessionKey to skip lookup)
- `getLaps({ year, raceName?, sessionKey?, driver?, lap? })` - Lap times
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
- `getPitStops(sessionKey, driverNumber)` - Pit stop data
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
} from "@f1/react";

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

## Architecture

```
packages/
├── core/           # Main API package
│   ├── src/api/    # OpenF1 API functions
│   └── src/schemas/ # Zod schemas
└── react/          # React bindings
```