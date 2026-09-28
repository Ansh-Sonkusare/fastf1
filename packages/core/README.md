# @teakmirror113/f1-core

TypeScript client for Formula 1 data from [OpenF1](https://openf1.org) and the [Jolpica](https://github.com/jolpica/jolpica-f1) Ergast mirror: schedules, results, laps, stints, pit stops, weather, car telemetry and race control.

Pass a year, a race name and a driver code; the client resolves the session and driver numbers for you. Every call is an [Effect](https://effect.website), and `toPromise` runs one as a plain promise.

```bash
npm install @teakmirror113/f1-core
```

## Quick start

```ts
import { getRaceStints, getSessionLaps, getSchedule, toPromise } from "@teakmirror113/f1-core";

const schedule = await toPromise(getSchedule(2025));

const laps = await toPromise(getSessionLaps({ year: 2025, raceName: "Abu Dhabi", driver: "VER" }));
const stints = await toPromise(getRaceStints({ year: 2025, raceName: "Abu Dhabi", driver: "NOR" }));
```

Inside an Effect program, use the functions directly and provide `F1ClientServiceLive`.

## Friendly API

Each takes `year` plus `raceName` or `round`. `session` defaults to the race.

| Function | Returns |
|---|---|
| `getRace({ year, name?, round? })` | The meeting |
| `getSession({ year, raceName?, round?, session? })` | The session, resolved from a name like `"race"` or `"qualifying"` |
| `getSessionLaps({ year, raceName?, driver?, lap? })` | Lap times |
| `getRaceStints({ year, raceName?, driver? })` | Tyre stints |
| `getRacePitStops({ year, raceName?, driver? })` | Pit stops |
| `getRaceWeather({ year, raceName? })` | Weather samples |
| `getRaceTelemetry({ year, raceName?, driver })` | Speed, throttle, brake, RPM and gear |
| `getFastestLap({ year, raceName?, driver? })` | The fastest lap |

## Season data

`getSchedule`, `getRaceResults`, `getDriverStandings`, `getConstructorStandings`, `getLaps`, `getPitStops`, `getCircuitInfo` and `getDriverCareer` read the Ergast-format data from Jolpica.

## Analysis helpers

`getTyreDegradation`, `getStintPace`, `getDriverConsistency`, `getRaceDeltas`, `getPitStopAnalysis`, `getPositionChanges`, `compareDrivers` and `compareStints` work on the rows the API returns.

React hooks live in [`@teakmirror113/f1-react`](https://www.npmjs.com/package/@teakmirror113/f1-react). [Undercut](https://github.com/Ansh-Sonkusare/undercut), a race-strategy terminal, is built on both.

Unofficial and not associated with Formula 1. MIT licensed.
