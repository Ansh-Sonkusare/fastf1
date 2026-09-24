# OpenF1 API reference

`@f1/core` wraps the [OpenF1 API](https://openf1.org) (`https://api.openf1.org/v1`). This page documents every exported OpenF1 function as it exists in `packages/core/src/api/endpoints/`. Runnable scripts live in `examples/openf1/`.

## Call a function

Every data function returns an Effect, not a Promise:

```ts
Effect.Effect<readonly T[], ClientError, F1ClientService>
```

To get a Promise, wrap the Effect in `toPromise`. It provides `F1ClientServiceLive` (the `fetch`-based HTTP client) and runs the Effect.

```ts
import { getMeetings, toPromise } from "@f1/core";

const meetings = await toPromise(getMeetings(2024));
```

To stay in Effect, provide the layer yourself:

```ts
import { Effect } from "effect";
import { F1ClientServiceLive, getMeetings } from "@f1/core";

const meetings = await Effect.runPromise(Effect.provide(getMeetings(2024), F1ClientServiceLive));
```

### Errors

The error channel is `ClientError`, a union of three tagged errors:

| `_tag` | Cause | Retried |
| --- | --- | --- |
| `RateLimitError` | HTTP 429 | Yes. Waits `Retry-After` seconds (max 60), else exponential backoff. |
| `TimeoutError` | No response within 10 seconds | Yes, exponential backoff |
| `F1ClientError` | Any other non-2xx status, network failure, or invalid JSON | Only for status 500 or higher |

A request makes at most 4 attempts. Exponential backoff waits 100 ms, 200 ms, then 400 ms.

OpenF1 answers HTTP 404 `{"detail":"No results found."}` when a query matches nothing. The function then fails with `F1ClientError` and `status: 404`. It does not succeed with an empty array.

### Null handling and decoding

Each function decodes every row with an Effect Schema from `packages/core/src/schemas/openf1.ts`:

- A field declared `nullish(...)` accepts `null`, and decoding removes the key. In TypeScript the field is optional (`field?: T`), so read it as `T | undefined`, never `null`.
- A required field that arrives as `null`, missing, or with the wrong type fails decoding. `parseOrDie` throws, so the Effect dies with a defect. `toPromise` rejects, but the failure is not in the `ClientError` channel.
- Fields not in the schema are dropped. For example, `/session_result` sends `points`, which `SessionResult` does not keep.

`cleanNulls` in `_shared.ts` copies the response recursively and keeps `null` values. The schemas do the null removal. The PRD's `cleanNulls`, which filters nulls before Zod validation, does not exist.

### Optional numeric arguments

Optional arguments such as `driverNumber` and `lapNumber` are sent only when truthy. `undefined` and `0` both omit the query parameter.

## Meetings and sessions

### getMeetings

```ts
getMeetings(year: number): Effect<readonly Meeting[], ClientError, F1ClientService>
```

Sends `GET /meetings?year={year}`. Returns one `Meeting` per event, including pre-season testing.

Key fields are `meeting_key`, `meeting_name` (for example `"Bahrain Grand Prix"`), `meeting_official_name`, `year`, `location`, `country_name`, `circuit_short_name`, `date_start`, and `date_end`. Optional fields are `meeting_round`, `country_flag`, and `is_cancelled`.

```ts
const bahrain = (await toPromise(getMeetings(2024))).find((m) => m.meeting_name === "Bahrain Grand Prix");
```

### getSessions

```ts
getSessions(meetingKey: number): Effect<readonly Session[], ClientError, F1ClientService>
```

Sends `GET /sessions?meeting_key={meetingKey}`. Returns the sessions of one meeting.

Key fields are `session_key`, `session_name` (`"Practice 1"`, `"Sprint Qualifying"`, `"Sprint"`, `"Qualifying"`, `"Race"`), `session_type`, `date_start`, `date_end`, and `gmt_offset`. Pass `session_key` to every function below.

```ts
const race = (await toPromise(getSessions(1229))).find((s) => s.session_name === "Race");
```

### getDrivers

```ts
getDrivers(sessionKey: number): Effect<readonly OpenF1Driver[], ClientError, F1ClientService>
```

Sends `GET /drivers?session_key={sessionKey}`. Returns one row per driver entered in the session.

Key fields are `driver_number`, `name_acronym` (`"VER"`), `full_name`, `broadcast_name`, `team_name`, and `team_colour` (hex without `#`). `headshot_url` is optional.

```ts
const acronyms = new Map((await toPromise(getDrivers(9472))).map((d) => [d.driver_number, d.name_acronym]));
```

## Laps, stints, pit stops, and position

### getOpenF1Laps

```ts
getOpenF1Laps(sessionKey: number, driverNumber?: number, lapNumber?: number): Effect<readonly OpenF1Lap[], ClientError, F1ClientService>
```

Sends `GET /laps` with `session_key`, and `driver_number` and `lap_number` when given.

Key fields are `driver_number`, `lap_number`, `lap_duration` (seconds), `duration_sector_1` to `duration_sector_3`, `i1_speed`, `i2_speed`, `st_speed` (km/h), `date_start`, and `is_pit_out_lap`. Every timing field is optional. `segments_sector_1` to `segments_sector_3` are arrays of mini-sector codes that can contain `null`.

```ts
const [lap] = await toPromise(getOpenF1Laps(9472, 1, 10));
```

### getStints

```ts
getStints(sessionKey: number, driverNumber?: number): Effect<readonly Stint[], ClientError, F1ClientService>
```

Sends `GET /stints` with `session_key`, and `driver_number` when given.

Key fields are `driver_number`, `stint_number`, `lap_start`, `lap_end`, `compound` (for example `"SOFT"` or `"HARD"`), and optional `tyre_age_at_start`.

```ts
const verStints = await toPromise(getStints(9472, 1));
```

### getOpenF1PitStops (source name getPitStops)

```ts
getOpenF1PitStops(sessionKey: number, driverNumber?: number): Effect<readonly OpenF1Pit[], ClientError, F1ClientService>
```

`packages/core/src/api/openf1.ts` exports this function as `getPitStops`. `@f1/core` re-exports it as `getOpenF1PitStops`, because `getPitStops` is already the Ergast pit-stop function.

Sends `GET /pit` with `session_key`, and `driver_number` when given.

All fields other than the keys are optional: `lap_number`, `stop_number`, `pit_duration` (pit entry to exit, seconds), `lane_duration`, `stop_duration` (stationary time), and `date`.

```ts
const pits = await toPromise(getOpenF1PitStops(9472));
```

### getPosition

```ts
getPosition(sessionKey: number, driverNumber?: number): Effect<readonly Position[], ClientError, F1ClientService>
```

Sends `GET /position` with `session_key`, and `driver_number` when given. Returns one row per position change, not per lap.

Fields are `driver_number`, `position`, and `date`.

```ts
const changes = await toPromise(getPosition(9472, 1));
```

## Telemetry

### getCarData

```ts
getCarData(
  sessionKey: number,
  driverNumber?: number,
  opts?: { dateGt?: string; dateLt?: string },
): Effect<readonly CarData[], ClientError, F1ClientService>
```

Sends `GET /car_data` with `session_key`, `driver_number` when given, and `date>` and `date<` from `opts.dateGt` and `opts.dateLt`. The keys are URL-encoded as `date%3E` and `date%3C`, which OpenF1 accepts.

Samples arrive at about 3.7 Hz. Fields are `driver_number`, `date`, and the optional `speed` (km/h), `rpm`, `n_gear`, `throttle` (percent), `brake` (`0` or `100`), and `drs` (a status code). Query one lap with a date window. At that rate a two-hour race is over 25,000 rows per driver.

```ts
const samples = await toPromise(getCarData(9472, 1, { dateGt: "2024-03-02T15:18:15Z", dateLt: "2024-03-02T15:19:52Z" }));
```

`examples/openf1/speed-trace.ts` derives the window from a lap's `date_start` and `lap_duration`.

### getLocation

```ts
getLocation(sessionKey: number, driverNumber?: number): Effect<readonly OpenF1Location[], ClientError, F1ClientService>
```

Sends `GET /location` with `session_key`, and `driver_number` when given. There is no date filter.

Fields are `driver_number`, `date`, `x`, `y`, and optional `z`, in track coordinates. One driver in the 2024 Bahrain race returned 35,994 rows.

```ts
const trace = await toPromise(getLocation(9472, 1));
```

## Session context

### getWeather

```ts
getWeather(sessionKey: number): Effect<readonly Weather[], ClientError, F1ClientService>
```

Sends `GET /weather?session_key={sessionKey}`. Returns about one row per minute.

Fields are `date` and the optional `air_temperature`, `track_temperature` (°C), `humidity` (percent), `pressure` (mbar), `wind_speed` (m/s), `wind_direction` (degrees), `precipitation`, and `track_surface_temperature`.

```ts
const weather = await toPromise(getWeather(9472));
```

### getRaceControl

```ts
getRaceControl(sessionKey: number): Effect<readonly RaceControl[], ClientError, F1ClientService>
```

Sends `GET /race_control?session_key={sessionKey}`.

Required fields are `date`, `category`, and `message`. The 2024 Bahrain race has the categories `"CarEvent"`, `"Drs"`, `"Flag"`, `"Other"`, and `"SessionStatus"`. Optional fields are `flag`, `scope`, `sector`, `lap_number`, `driver_number`, and `qualifying_phase`.

```ts
const flags = (await toPromise(getRaceControl(9472))).filter((m) => m.category === "Flag");
```

### getTeamRadio

```ts
getTeamRadio(sessionKey: number): Effect<readonly TeamRadio[], ClientError, F1ClientService>
```

Sends `GET /team_radio?session_key={sessionKey}`.

The schema requires `driver_number`, `date`, `message`, and `driver_id`. OpenF1 sends `recording_url` and no `message` or `driver_id`, so this function currently dies on decoding. See [Known issues](#known-issues).

```ts
const radio = await toPromise(getTeamRadio(9472));
```

### getOvertakes

```ts
getOvertakes(sessionKey: number): Effect<readonly Overtake[], ClientError, F1ClientService>
```

Sends `GET /overtakes?session_key={sessionKey}`.

Fields are `date`, `overtaking_driver_number`, `overtaken_driver_number`, and `position` (the overtaking driver's new position).

```ts
const passes = await toPromise(getOvertakes(9472));
```

## Results

### getSessionResult

```ts
getSessionResult(sessionKey: number): Effect<readonly SessionResult[], ClientError, F1ClientService>
```

Sends `GET /session_result?session_key={sessionKey}`.

Required fields are `driver_number`, `position`, `number_of_laps`, `dnf`, `dns`, and `dsq`. `duration` (seconds) and `gap_to_leader` (seconds, `0` for the winner) are optional.

This function dies on decoding for most races and every qualifying session. See [Known issues](#known-issues). It works on sessions where every driver finishes on the lead lap, such as the 2024 Chinese Grand Prix sprint (`9672`).

```ts
const results = await toPromise(getSessionResult(9672));
```

### getStartingGrid

```ts
getStartingGrid(sessionKey: number): Effect<readonly StartingGrid[], ClientError, F1ClientService>
```

Sends `GET /starting_grid?session_key={sessionKey}`.

Fields are `driver_number`, `position`, and optional `lap_duration` (the qualifying lap).

OpenF1 files the grid under the qualifying session that set it. Pass the `"Qualifying"` session key for a race grid and the `"Sprint Qualifying"` key for a sprint grid. The race session key returns 404.

```ts
const grid = await toPromise(getStartingGrid(9468));
```

### getIntervals

```ts
getIntervals(sessionKey: number): Effect<readonly Interval[], ClientError, F1ClientService>
```

Sends `GET /intervals?session_key={sessionKey}`. OpenF1 publishes intervals for races only.

Fields are `driver_number`, `date`, and the optional `gap_to_leader` and `interval` (gap to the car ahead), in seconds. It dies on decoding whenever a car is lapped. See [Known issues](#known-issues).

```ts
const gaps = await toPromise(getIntervals(9672));
```

## Configuration

### setOpenF1BaseUrl and getOpenF1BaseUrl

```ts
setOpenF1BaseUrl(url: string): void
getOpenF1BaseUrl(): string
```

The base URL defaults to `https://api.openf1.org/v1`. `setOpenF1BaseUrl` changes it for every later request in the process. Use it to point at a proxy or a local mock server. The cache key includes the base URL, so entries from the old base are never served for the new one.

```ts
setOpenF1BaseUrl("http://localhost:8080/v1");
```

### clearOpenF1Cache

```ts
clearOpenF1Cache(): void
```

Deletes every cached response, including in-flight entries. A request that is in flight during the clear still resolves its waiters, and then writes its result back into the cache. See [Caching](#caching).

### setOpenF1CacheEnabled

```ts
setOpenF1CacheEnabled(enabled: boolean): void
```

`false` stops cache reads and writes. Every call goes to the network, and concurrent identical calls are no longer shared. Existing entries stay in memory. `true` turns caching back on, and unexpired entries are served again.

## Caching

The cache lives in `packages/core/src/api/endpoints/cache.ts`. `fetchOpenF1` in `_shared.ts` is the only reader and writer.

- **Scope.** One module-level `QuickLRU` shared by every caller in the JavaScript process. `toPromise` builds a fresh `F1ClientServiceLive` layer per call, so a layer-scoped cache would never hit. The module-level cache hits across `toPromise` calls and across `@f1/react` hooks.
- **Key.** The full request URL, including the base URL and the query string, for example `https://api.openf1.org/v1/stints?session_key=9472&driver_number=1`. Argument order is fixed per function, so equal arguments give equal keys.
- **Lifetime.** Each entry expires 1 hour after it is written (`maxAge`). `maxSize` is 100 and least recently used entries go first.
- **What is stored.** The response JSON before schema decoding. Every call decodes again. A decoding failure does not evict the entry.
- **Success only.** When the HTTP request fails or is interrupted, the entry is deleted. The next call fetches again.
- **In-flight sharing.** The first call for a key stores a pending `Deferred`. Concurrent calls with the same key wait on it instead of sending their own request. They receive the same value, failure, or interruption.

`examples/openf1/cache-demo.ts` counts the real `fetch` calls:

```text
first call                       network calls 1 [200]  494 ms
repeat call                      network calls 0 []  1 ms
3 concurrent calls after clear   network calls 1 [200]  152 ms
2 calls with cache disabled      network calls 3 [200, 429, 200]  1451 ms
```

The last line shows a 429 from the rate limit and its retry after `Retry-After: 1`.

### Isolate tests from the cache

The cache outlives a single test, so a mocked response from one test can leak into the next. `packages/core/vite.config.ts` registers `src/test/setup.ts` in `test.setupFiles`. That file runs before each test:

```ts
beforeEach(() => {
  clearOpenF1Cache();
  setOpenF1CacheEnabled(true);
});
```

To test code outside `@f1/core` that calls these functions, add the same `beforeEach` to your own setup file.

## Data availability

- OpenF1 has meetings from 2023 onward. `getMeetings(2022)` fails with a 404 (measured 2026-09-24).
- A session has data only after it has run. Future sessions, and endpoints a session type does not have (for example `/intervals` outside races), return 404.
- The public API allows 3 requests per second. A burst of 8 parallel requests got 3 answers and 5 responses of HTTP 429 `{"detail":"Rate limit exceeded. Max 3 requests/second."}` with `retry-after: 1` (measured 2026-09-24). The client retries these, and the cache avoids repeat requests.
- `/car_data` and `/location` are large. Filter by driver, and for `getCarData` by date window.

## Known issues

These are schema mismatches in `packages/core/src/schemas/openf1.ts` against live data, measured on 2026-09-24. Each makes the function die with a defect.

| Function | Live data | Schema expects |
| --- | --- | --- |
| `getSessionResult`, `getIntervals` | `gap_to_leader: "+1 LAP"` for lapped cars (session `9472`) | `number` or `null` |
| `getSessionResult` | `duration: [90.031, 89.374, 89.179]` in qualifying (session `9468`) | `number` or `null` |
| `getSessionResult` | `position: null` for drivers with `dnf: true` (session `9506`) | `number` |
| `getTeamRadio` | `recording_url`, no `message` or `driver_id` (session `9472`) | `message` and `driver_id` required |

## Differences from the PRD

`docs/prd-openf1-integration.md` describes an earlier plan. The source differs:

- Functions return `Effect`, not `Promise`. Use `toPromise`.
- Pit stops are exported as `getOpenF1PitStops`, not `getPitStops`.
- `getCarData` takes an `opts` date window that the PRD does not list.
- Validation uses Effect Schema, not Zod. Nulls are removed by `nullish` schema fields, not by a `cleanNulls` pre-pass.
- `CarData.brake` is a number (`0` or `100`), not a boolean. Timing fields the PRD types as `number | null` are optional (`number | undefined`).
- Empty results fail with a 404 `F1ClientError` instead of returning `[]`.
- The PRD notes 2025 as empty. Live data now covers 2023 to 2026.

## Run the examples

`@f1/core` resolves to `packages/core/dist`, so build it first. Then run a script from the repository root:

```bash
pnpm --filter @f1/core build
npx tsx examples/openf1/session-results.ts
```

| Script | Shows |
| --- | --- |
| `session-results.ts` | Meeting and session lookup, then sprint result, grid, and drivers |
| `stint-summary.ts` | Tyre compound sequence per driver |
| `speed-trace.ts` | Car data for one lap, windowed by the lap's start and duration |
| `cache-demo.ts` | Network call counts for repeat, concurrent, cleared, and disabled-cache calls |
