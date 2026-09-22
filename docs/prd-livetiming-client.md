# Live Timing SignalR Client PRD

## Summary

Add a live timing client to `@f1/core` that connects to F1's official SignalR WebSocket endpoint (`wss://livetiming.formula1.com/signalr`), decodes the incremental delta feed, and exposes typed data. Provide a Node.js proxy/relay so browser frontends can subscribe without CORS issues, and React hooks for consumption.

## Problem

- Current data is all **polled/historical** via Ergast + OpenF1 REST APIs
- No way to watch a session live — users want real-time lap times, positions, sector deltas, weather, track status
- FastF1 (Python) has a SignalR client but this TS monorepo doesn't
- Browser clients **cannot** connect directly to `livetiming.formula1.com` (no CORS headers, no WS upgrade with custom headers from a browser context, cookies scoped to `formula1.com`)
- Need an intermediate relay if the frontend needs live data

## Goals

1. Parse the raw SignalR WebSocket feed into typed, structured data
2. `SignalRClient` (Node.js) — connect, negotiate, subscribe, reconnect, emit typed events
3. `LiveTimingProxy` (Node.js) — local WebSocket server that wraps `SignalRClient` and re-broadcasts typed frames to any local client (browser, CLI, etc.)
4. `useLiveTiming` React hook — connect to proxy, stream state into React
5. Zod schemas for all topics
6. Handle reconnection, token expiry, graceful shutdown
7. CLI demo that streams live timing to terminal

## Non-Goals

- Historical replay from SignalR (use OpenF1 REST for that)
- Writing raw SignalR data to disk (that's what the Python FastF1 does; we parse live)
- Telemetry-like 1Hz car data (OpenF1 REST already covers that)
- Authentication/paid tiers — only public SignalR endpoint

## Architecture

```
┌─────────────┐     SignalR      ┌──────────────────┐
│  F1 Server  │◄────────────────►│  SignalRClient   │
│  livetiming │   wss://...      │  (@f1/core)      │
│  .f1.com     │                  │  Node.js only    │
└─────────────┘                  └────────┬─────────┘
                                          │ typed events
                                          ▼
┌───────────────────────────────────────────────────┐
│            LiveTimingProxy (Node.js)               │
│  Listens on ws://localhost:3001/ws/live            │
│  Forwards typed LiveTimingState as JSON            │
│  One SignalRClient → N local clients               │
└────────┬──────────────────────────────────────────┘
         │ ws://localhost:3001/ws/live
         ▼
┌──────────────────────┐
│  React App           │
│  useLiveTiming()     │
│  (@f1/react)         │
└──────────────────────┘
```

**Browser path**: The React app connects to the local proxy. No direct connection to F1.

**CLI/Node path**: `SignalRClient` can be used directly (no proxy needed).

## Package Structure

Add to `@f1/core/src/livetiming/`:

```
src/livetiming/
├── client.ts          # SignalRClient — negotiate → WS → init → subscribe → events
├── protocol.ts        # SignalR wire protocol: frame parsing, message envelopes
├── proxy.ts           # LiveTimingProxy — local WS relay server
├── types.ts           # SignalR message envelopes, cursor tracking
├── topics/
│   ├── index.ts       # exports all topic handlers
│   ├── timing-data.ts # TimingData normalizer → typed state
│   ├── timing-app.ts  # TimingAppData normalizer (stints)
│   ├── weather.ts     # WeatherData normalizer
│   ├── heartbeat.ts   # Heartbeat (liveness check)
│   ├── session.ts     # SessionInfo, SessionData
│   ├── track.ts       # TrackStatus
│   └── lap-count.ts   # LapCount
└── state.ts           # LiveTimingState — aggregated mutable state from deltas
```

## Data Model

### LiveTimingState (accumulated from delta messages)

```typescript
interface LiveTimingState {
  session: SessionInfo | null;
  sessionData: SessionData | null;
  trackStatus: TrackStatus | null;
  lapCount: LapCount | null;
  weather: WeatherData | null;
  drivers: Map<number, DriverLiveData>;
  lastHeartbeat: string | null;
}

interface DriverLiveData {
  line: number;          // running order index
  position: number;      // displayed position
  numberOfLaps: number;
  
  // Sector times (string because "—" or empty shown live)
  sector1: string | null;
  sector2: string | null;
  sector3: string | null;
  sector1Previous: string | null;
  sector2Previous: string | null;
  sector3Previous: string | null;
  overallFastestSector1: boolean;
  overallFastestSector2: boolean;
  overallFastestSector3: boolean;
  personalFastestSector1: boolean;
  personalFastestSector2: boolean;
  personalFastestSector3: boolean;

  // Speeds
  speedI1: string | null;    // intermediate 1 (km/h)
  speedI2: string | null;    // intermediate 2
  speedFL: string | null;    // finish line
  speedST: string | null;    // speed trap

  // Segment status (per sector, array of status codes)
  segmentsSector1: number[];
  segmentsSector2: number[];
  segmentsSector3: number[];

  // Lap times
  lastLapTime: string | null;
  bestLapTime: string | null;
  bestLapNumber: number | null;

  // Deltas
  timeDiffToFastest: string | null;     // "+1.950"
  timeDiffToPositionAhead: string | null;

  // Stints (from TimingAppData)
  totalLapsOnTyre: number | null;
}

// Topic-specific payloads (from the raw wire)

interface SessionInfo { ... }  // circuit, session type, start time
interface SessionData { ... }  // green/yellow/red flag, VSC, SC
interface TrackStatus { ... }  // marshal sectors
interface LapCount {
  currentLap: number;
  totalLaps: number;
}
interface WeatherData {
  airTemp: string;
  humidity: string;
  pressure: string;
  rainfall: string;
  trackTemp: string;
  windDirection: string;
  windSpeed: string;
}
```

### SignalR Wire Types

```typescript
interface SignalRMessage {
  H: "Streaming";
  M: "feed";
  A: [topic: string, payload: unknown, timestamp: string];
}

interface SignalREnvelope {
  C: string;            // cursor
  G?: string;           // group token
  I?: string;           // message ID (for responses to client sends)
  M: SignalRMessage[];
}
```

## API Surface

### @f1/core — SignalRClient

```typescript
interface SignalRClientOptions {
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  subscribeTopics?: Topic[];
  proxyUrl?: string;        // if set, connect via proxy instead of direct
  logLevel?: "silent" | "error" | "info" | "debug";
}

type Topic =
  | "Heartbeat" | "SessionInfo" | "SessionData"
  | "TrackStatus" | "TimingData" | "LapCount"
  | "TimingAppData" | "WeatherData";

declare class SignalRClient {
  constructor(options?: SignalRClientOptions);
  
  // Events
  on(event: "state", handler: (state: LiveTimingState) => void): void;
  on(event: "raw", handler: (envelope: SignalREnvelope) => void): void;
  on(event: "error", handler: (err: Error) => void): void;
  on(event: "connected" | "disconnected", handler: () => void): void;
  on(event: "topic", handler: (topic: Topic, data: unknown) => void): void;
  
  // Control
  connect(sessionId?: string): Promise<void>;
  subscribe(topics: Topic[]): void;
  disconnect(): void;
  
  // Snapshot
  getState(): LiveTimingState;
}
```

### @f1/core — LiveTimingProxy

```typescript
interface LiveTimingProxyOptions {
  port?: number;             // default 3001
  path?: string;             // default "/ws/live"
  signalRClient?: SignalRClient;  // or creates its own
  autoStart?: boolean;
}

declare class LiveTimingProxy {
  constructor(options?: LiveTimingProxyOptions);
  start(): Promise<void>;
  stop(): void;
}
```

Can be started standalone via CLI:

```bash
npx f1-live --port 3001
```

### @f1/react — useLiveTiming

```typescript
interface UseLiveTimingOptions {
  proxyUrl: string;            // Required: "ws://localhost:3001/ws/live"
  initialState?: LiveTimingState;
  autoConnect?: boolean;        // default true
}

interface UseLiveTimingResult {
  state: LiveTimingState;
  isConnected: boolean;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
}

function useLiveTiming(options: UseLiveTimingOptions): UseLiveTimingResult;
```

## Edge Cases

### Connection lifecycle
| State | Handling |
|---|---|
| **Token expiry** | Negotiate returns 403 after ~30 min. Detect close, re-negotiate, re-init, re-subscribe. |
| **No session live** | WebSocket connects, topics return empty/initial data. `SessionInfo` shows no active session. State stays empty. |
| **Session starts mid-stream** | `SessionInfo` fires, then data flows. Client handles gracefully after connect. |
| **Network drop** | Reconnect with exponential backoff (1s → 2s → 4s → max 30s). Re-negotiate on reconnect. |
| **Rate limiting** | 429 on negotiate? Already handled by F1Client's retry. SignalRClient wraps negotiate in F1Client. |
| **Multiple browser tabs** | Each tab opens its own proxy WS connection. Single SignalRClient per proxy instance. |
| **Browser direct connection** | Don't do it. CORS and cookie domain restrictions will fail. Proxy required. |

### Data edge cases
| Case | Handling |
|---|---|
| **Delta before full state** | Buffer topics. Request `SessionInfo` explicitly on connect if not received within 1s. |
| **Empty string times** | Sector times arrive as `""` until driver completes sector. Parse as `null`. |
| **Segment array missing** | Some messages only send changed segments. Merge into existing segment state. |
| **No best lap set** | `BestLapTime.Value` is empty. Use `null`. |
| **Driver DNF** | Position becomes `"R"` or similar. Store as string. |
| **Monaco-specific** | 3 sectors, but segments per sector vary by circuit. Store raw array. |

## Implementation Phases

| Phase | Scope | Deps |
|---|---|---|
| **P1** | `protocol.ts` — frame parser (0x1e delimiting, JSON envelopes, cursor tracking) | none |
| **P1** | `client.ts` — negotiate → WS → init → subscribe → emit raw events | `F1Client` (reuse) |
| **P2** | `topics/` — typed parsers for each topic, state accumulator | P1 |
| **P2** | `state.ts` — `LiveTimingState` with delta merge logic | P2 |
| **P3** | `proxy.ts` — local WS server, re-broadcast typed state | P1 + P2 |
| **P3** | CLI demo — `examples/live-timing.ts` using SignalRClient directly | P2 |
| **P4** | `useLiveTiming` hook in `@f1/react` | P3 |
| **P4** | Example frontend (demo/) | P4 |

## Dependencies

New deps for `@f1/core`:

| Package | Reason |
|---|---|
| `ws` (npm) | WebSocket client with custom headers (Node.js native WebSocket doesn't support headers) |
| `ws` or `uWebSockets.js` | Also for the proxy server (upgrade HTTP→WS) |

Keep existing: `zod`, `quick-lru`.

No new deps for `@f1/react`.

## Open Questions

- WebSocket ping/pong: Does F1 server send ping frames? Does `ws` library handle keepalive? Or rely on `Heartbeat` topic?
- `SessionInfo` / `SessionData` / `TrackStatus` / `LapCount` — exact field names unknown until observed during a live race weekend
- Does the endpoint return data for non-live sessions (replay/historical)?
- Proxy auth: Should the proxy require a simple token for local-only use, or stay open (localhost default)?
- How does this interact with OpenF1 data? e.g., enrich `DriverLiveData.driverNumber` with `full_name` and `team_colour` from OpenF1 driver list

## Reference

- `docs/f1-signalr-websocket-schema.md` — raw wire format documentation
- `docs/prd-openf1-integration.md` — existing REST integration PRD
- `packages/core/src/http/client.ts` — `F1Client` (reuse for negotiate HTTP call)
