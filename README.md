# F1 Data Package

TypeScript package for accessing F1 race data from OpenF1 API.

## Install

```bash
pnpm install
pnpm build
```

## Usage

```typescript
import { 
  getOpenF1Laps, 
  getCarData, 
  getStints, 
  getPitStops 
} from "@f1/core";

const sessionKey = 11280; // Miami 2026
const driverNumber = 3;    // Max Verstappen

// Get fastest lap telemetry
const laps = await getOpenF1Laps(sessionKey, driverNumber);
const telemetry = await getCarData(sessionKey, driverNumber);

// Get race stints and pit stops
const stints = await getStints(sessionKey, driverNumber);
const pits = await getPitStops(sessionKey, driverNumber);
```

## Available APIs

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

## Examples

Run examples with bun:

```bash
# Interactive speed telemetry (btop-style)
bun run examples/speed-interactive.ts

# Static speed chart
bun run examples/speed-telemetry.ts

# CLI demo
bun run examples/cli.ts

# Race pace analysis
bun run examples/race-pace.ts
```

## Session Keys

Common session keys:
- `11280` - Miami 2026 (Race)
- `1108` - Japan 2025 (Race)
- `1107` - China 2025 (Race)
- `1068` - Abu Dhabi 2024 (Race)

Find more at https://openf1.org/

## Architecture

```
packages/
├── core/           # Main API package
│   ├── src/api/    # OpenF1 API functions
│   └── src/schemas/ # Zod schemas
└── react/          # React bindings
```