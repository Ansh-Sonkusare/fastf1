# F1 Live Timing SignalR WebSocket Schema

## Connection

```
1. GET https://livetiming.formula1.com/signalr/negotiate?negotiateVersion=1
   → get ConnectionToken + cookies

2. wss://livetiming.formula1.com/signalr?transport=webSockets&clientProtocol=1.5&connectionToken=<URL-encoded-token>
   Headers: User-Agent (browser), Origin: https://livetiming.formula1.com, Cookie: <from negotiate>

3. Send init:  {"protocol":"json","version":1}<0x1e>
   <0x1e> = record separator (ASCII 30), delimits each SignalR message frame

4. Subscribe: {"H":"Streaming","M":"Subscribe","A":[["Heartbeat","SessionInfo","SessionData","TrackStatus","TimingData","LapCount","TimingAppData","WeatherData"]]}<0x1e>
```

**Connection token is short-lived** — must re-negotiate for each session.

## Wire Format

SignalR JSON protocol. Each message delimited by `0x1e` (record separator).

### Envelope

```json
{
  "C": "d-<id>,<seq>|R,<seq>|F,...",
  "G": "<base64 group token>",
  "M": [ ... ]
}
```

- `C`: cursor (monotonically increasing message ID)
- `G`: group token from init response (optional)
- `M`: array of messages

### Message (inside `M[]`)

```json
{
  "H": "Streaming",
  "M": "feed",
  "A": ["<topic>", <payload>, "<ISO-timestamp>"]
}
```

- `H`: Hub name (always `"Streaming"`)
- `M`: Method (always `"feed"`)
- `A[0]`: topic string
- `A[1]`: payload (varies by topic)
- `A[2]`: ISO 8601 timestamp of server-side event time

## Topics

### Heartbeat

```json
["Heartbeat", {"Utc": "2026-05-22T20:37:30.6463647Z", "_kf": true}, "2026-05-22T20:37:28.682Z"]
```

Every ~2 seconds when subscribed.

---

### TimingData — Segment Status

```json
["TimingData", {"Lines": {
  "<driver-number>": {"Sectors": {"<sector-index>": {"Segments": {"<segment-index>": {"Status": <int>}}}}}
}}, "2026-05-22T20:37:26.019Z"]
```

**Segment status values:**
- `0`: cleared / inactive
- `2048`: green (track limits ok / normal)
- `2049`: yellow / suspicious
- `2051`: red / off-track or violation

Sector index: `"0"`, `"1"`, `"2"` (3 sectors per track).
Segment index: per-circuit array of mini-sectors, typically 5-8 per sector.

---

### TimingData — Sector Times

```json
["TimingData", {"Lines": {
  "<driver-number>": {"Sectors": {
    "<sector-index>": {
      "Value": "20.998",
      "OverallFastest": true|false,
      "PersonalFastest": true|false,
      "PreviousValue": "20.998"
    }
  }}
}}, "2026-05-22T20:37:27.821Z"]
```

- `Value`: sector time string (empty string if not yet set on this lap)
- `OverallFastest`: is this the fastest overall sector time
- `PersonalFastest`: is this the driver's personal fastest
- `PreviousValue`: previous lap's sector time (sent on next lap)

---

### TimingData — Speeds

```json
["TimingData", {"Lines": {
  "<driver-number>": {"Speeds": {
    "I1": {"Value": "251", "PersonalFastest": true},
    "I2": {"Value": ""},
    "FL": {"Value": ""},
    "ST": {"Value": ""}
  }}
}}, "2026-05-22T20:37:27.821Z"]
```

- `I1`: speed trap at intermediate 1 (km/h)
- `I2`: speed trap at intermediate 2
- `FL`: finish line speed
- `ST`: speed trap (sometimes on straights)

---

### TimingData — Position / Standing

```json
["TimingData", {"Lines": {
  "<driver-number>": {
    "Line": 12,
    "Position": "12",
    "NumberOfLaps": 6,
    "BestLapTimes": {"0": {"Value": "1:15.872", "Lap": 5}},
    "BestLapTime": {"Value": "1:15.872", "Lap": 5},
    "LastLapTime": {"Value": "1:15.872", "PersonalFastest": true}
  }
}}, "2026-05-22T20:37:34.424Z"]
```

- `Line`: track running order index (0-based? 1-based?)
- `Position`: displayed position string
- `NumberOfLaps`: total laps completed
- `BestLapTimes`: best lap time per... stint? compound?
- `BestLapTime`: overall best lap
- `LastLapTime`: most recent lap

---

### TimingData — Time Deltas

```json
["TimingData", {"Lines": {
  "<driver-number>": {"Stats": {
    "0": {"TimeDiffToFastest": "+1.950", "TimeDifftoPositionAhead": "+0.199"}
  }}
}}, "2026-05-22T20:37:34.424Z"]
```

- `TimeDiffToFastest`: gap to overall fastest driver
- `TimeDifftoPositionAhead`: gap to driver ahead

---

### TimingAppData — Stints

```json
["TimingAppData", {"Lines": {
  "<driver-number>": {"Stints": {
    "0": {"TotalLaps": 4},
    "0": {"LapTime": "1:15.872", "LapNumber": 6}
  }}
}}, "2026-05-22T20:37:34.424Z"]
```

---

### WeatherData

```json
["WeatherData", {
  "AirTemp": "19.8",
  "Humidity": "24.7",
  "Pressure": "1026.1",
  "Rainfall": "0",
  "TrackTemp": "41.8",
  "WindDirection": "166",
  "WindSpeed": "1.6",
  "_kf": true
}, "2026-05-22T20:37:35.409Z"]
```

Update frequency: ~every few seconds or on change.

---

### SessionInfo, SessionData, TrackStatus, LapCount

Not observed during sample (session was live, possibly Monaco GP practice). Expected structure:

- **SessionInfo**: circuit name, session type, start time, etc.
- **SessionData**: session status (green/yellow/red flag, VSC, SC, etc.)
- **TrackStatus**: track flags, marshal sectors
- **LapCount**: total laps in race, current lap number

## Data Flow

- Updates are **incremental** — each message sends only what changed.
- Multiple messages can batch in one envelope.
- TimingData can merge with TimingAppData in the same envelope:
  ```json
  {
    "M": [
      {"H":"Streaming","M":"feed","A":["TimingData", {...}, "..."]},
      {"H":"Streaming","M":"feed","A":["TimingAppData", {...}, "..."]}
    ]
  }
  ```
- No session is live right now for Monaco on May 22 — this was a historical/pre-season session replay? Or there's testing ongoing. Check `SessionInfo` for context.
