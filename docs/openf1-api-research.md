# OpenF1 API Research

## Overview
OpenF1 is a free, open F1 data API providing real-time and historical telemetry, lap times, positions, and more.

## Base URL
```
https://api.openf1.org/v1
```

## Endpoints

### Meetings
```
GET /meetings?year={year}
```
Returns all meetings (GP weekends, testing) for a year.

**Parameters:**
- `year` (required): 2023-2026

**Response:**
```json
[{
  "meeting_key": 1230,
  "meeting_name": "Bahrain Grand Prix",
  "location": "Sakhir",
  "country_key": 36,
  "year": 2024,
  "date_start": "2024-02-28T...",
  "date_end": "2024-03-02T..."
}]
```

### Sessions
```
GET /sessions?meeting_key={meeting_key}
GET /sessions?year={year}&session_type={type}
```
Returns all sessions for a meeting.

**Response:**
```json
[{
  "session_key": 9472,
  "session_type": "Race",
  "session_name": "Race",
  "meeting_key": 1230,
  "year": 2024
}]
```

### Drivers
```
GET /drivers?session_key={session_key}
```
Returns driver info for a session.

**Response:**
```json
[{
  "driver_number": 1,
  "full_name": "Max Verstappen",
  "team_name": "Red Bull Racing",
  "team_colour": "3671C6"
}]
```

### Laps
```
GET /laps?session_key={session_key}
GET /laps?session_key={session_key}&driver_number={number}
GET /laps?session_key={session_key}&lap_number={number}
```
Returns lap times with sector data.

**Response:**
```json
[{
  "session_key": 9472,
  "driver_number": 1,
  "lap_number": 1,
  "lap_duration": 95.831,
  "duration_sector_1": 36.294,
  "duration_sector_2": 29.707,
  "duration_sector_3": 29.83,
  "i1_speed": 284,
  "i2_speed": 294,
  "st_speed": 298,
  "segments_sector_1": [2048, 2049, ...]
}]
```

### Stints
```
GET /stints?session_key={session_key}
GET /stints?session_key={session_key}&driver_number={number}
```
Returns tyre stint data.

**Response:**
```json
[{
  "session_key": 9472,
  "driver_number": 1,
  "stint_number": 1,
  "lap_start": 1,
  "lap_end": 21,
  "compound": "MEDIUM"
}]
```

### Pit Stops
```
GET /pit?session_key={session_key}
GET /pit?session_key={session_key}&driver_number={number}
```
Returns pit stop data.

**Response:**
```json
[{
  "driver_number": 1,
  "lap_number": 22,
  "pit_duration": 22.456,
  "lane_duration": 1.232
}]
```

### Position
```
GET /position?session_key={session_key}
GET /position?session_key={session_key}&driver_number={number}
```
Returns position changes over time.

### Weather
```
GET /weather?session_key={session_key}
```
Returns weather data (air temp, track temp, humidity, wind, rain).

**Response:**
```json
[{
  "air_temperature": 28.5,
  "track_temperature": 42.1,
  "humidity": 45,
  "wind_speed": 12,
  "precipitation": 0
}]
```

### Car Data (Telemetry)
```
GET/car_data?session_key={session_key}
GET/car_data?session_key={session_key}&driver_number={number}
```
Returns high-frequency telemetry.

**Response:**
```json
[{
  "driver_number": 1,
  "speed": 312,
  "rpm": 12000,
  "n_gear": 8,
  "throttle": 85,
  "brake": false,
  "drs": 0
}]
```

### Other Endpoints
- `/location` - GPS coordinates
- `/race_control` - Race control messages (flags, SC)
- `/team_radio` - Team radio messages
- `/overtakes` - Overtake events
- `/session_result` - Final standings
- `/starting_grid` - Grid positions
- `/intervals` - Gap to leader

## Data Availability

| Year | Lap Data | Status |
|------|----------|--------|
| 2023 | Partial | Limited sessions |
| 2024 | ✅ Yes | Full season (Bahrain: 1129, Saudi: 902) |
| 2025 | ✅ Yes | Full season (Australian GP: 928 laps, Pre-season: 1326 laps) |
| 2026 | ✅ Yes | Japanese, Miami, Chinese Sprint |

### Known Sessions with Data (2024)
- Bahrain GP Race (key: 9472) - 1129 laps
- Saudi GP Race (key: 9480) - 902 laps
- Abu Dhabi GP Race (key: 9662) - 1037 laps

### Known Sessions with Data (2025)
- Australian GP Race (key: 9693) - 928 laps
- Pre-Season Testing (key: 9683) - 1326 laps

### Known Sessions with Data (2026)
- Japanese GP Race (key: 11253) - 1108 laps
- Miami GP Race (key: 11280) - 1020 laps
- Chinese GP Sprint (key: 11240) - 399 laps

## Rate Limits
- Unknown exact limits
- Implement caching (1 hour TTL)
- Use `quick-lru` for in-memory cache

## Data Quirks
- Numeric fields return `null` when data unavailable (not 0)
- Arrays can contain `null` elements
- Need to filter nulls before Zod validation
- Some sessions return "No results found"

## Authentication
- None required (free, public API)

## References
- Official docs: https://docs.openf1.org/
- GitHub: https://github.com/theOehrly/Fast-F1-Python