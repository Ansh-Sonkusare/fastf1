# OpenF1 Integration PRD

## Summary
Add OpenF1 API integration to @f1/core package to provide high-frequency telemetry, sector times, tyre data, weather, and other real-time race data that Ergast doesn't offer.

## Problem Statement
- Ergast (current data source) only provides basic lap times, no sector times, no telemetry
- Need advanced data: sector times, speed traps, tyre compounds, pit durations, weather, telemetry
- OpenF1 provides this data for free but has different data structure than Ergast

## Goals
1. Integrate all OpenF1 endpoints into @f1/core
2. Handle data quirks (null values, missing sessions)
3. Provide same caching/interface pattern as Ergast
4. Full test coverage with TDD

## Non-Goals
- Real-time WebSocket streaming (out of scope)
- Data validation beyond schema (assume API correct)

## API Surface

### New Functions
```typescript
// Meetings & Sessions (2023+)
getMeetings(year: number): Promise<Meeting[]>
getSessions(meetingKey: number): Promise<Session[]>

// Race Data
getOpenF1Laps(sessionKey: number, driverNumber?: number, lapNumber?: number): Promise<OpenF1Lap[]>
getStints(sessionKey: number, driverNumber?: number): Promise<Stint[]>
getPitStops(sessionKey: number, driverNumber?: number): Promise<PitStop[]>
getPosition(sessionKey: number, driverNumber?: number): Promise<Position[]>

// Telemetry
getCarData(sessionKey: number, driverNumber?: number): Promise<CarData[]>
getLocation(sessionKey: number, driverNumber?: number): Promise<Location[]>

// Context
getWeather(sessionKey: number): Promise<Weather[]>
getRaceControl(sessionKey: number): Promise<RaceControl[]>
getTeamRadio(sessionKey: number): Promise<TeamRadio[]>
getOvertakes(sessionKey: number): Promise<Overtake[]>

// Results
getSessionResult(sessionKey: number): Promise<SessionResult[]>
getStartingGrid(sessionKey: number): Promise<StartingGrid[]>
getIntervals(sessionKey: number): Promise<Interval[]>
```

### Data Structures
```typescript
interface Meeting {
  meeting_key: number;
  meeting_name: string;
  location: string;
  country_key: number;
  year: number;
  date_start: string;
  date_end: string;
}

interface OpenF1Lap {
  session_key: number;
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  i1_speed: number | null;
  i2_speed: number | null;
  st_speed: number | null;
}

interface Stint {
  session_key: number;
  driver_number: number;
  stint_number: number;
  lap_start: number;
  lap_end: number;
  compound: string;
}

interface CarData {
  driver_number: number;
  speed: number;
  rpm: number;
  n_gear: number;
  throttle: number;
  brake: boolean;
  drs: number;
}
```

## Technical Approach

### Implementation
1. Use existing F1Client infrastructure
2. Create separate OpenF1 client with base URL `https://api.openf1.org/v1`
3. Add data cleaning helper to handle null values
4. Cache responses (1 hour TTL)

### Data Cleaning
OpenF1 returns null for missing data. Must filter before Zod validation:
```typescript
function cleanNulls(obj) {
  if (obj === null) return undefined;
  if (Array.isArray(obj)) return obj.filter(x => x != null).map(cleanNulls);
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, cleanNulls(v)])
    );
  }
  return obj;
}
```

### Error Handling
- Not all sessions have data - handle gracefully
- Some years may have no data (2025 currently empty)
- Rate limits apply - rely on caching

## Timeline
1. Phase 1: Core endpoints (meetings, sessions, drivers, laps) - DONE
2. Phase 2: Telemetry & Stints - DONE  
3. Phase 3: TDD on all functions, edge cases
4. Phase 4: Documentation, examples

## Dependencies
- zod (validation)
- quick-lru (caching - already in use)

## Risks
- OpenF1 may have rate limits we don't know
- Data availability varies by year
- No authentication = no SLA

## Open Questions
- What are exact rate limits?
- How often is data updated?
- Is there a webhook for real-time?