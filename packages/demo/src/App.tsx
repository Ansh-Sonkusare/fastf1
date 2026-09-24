import { useMemo, useState } from "react";
import type { CarData, RaceResult, RaceTable } from "@f1/core";
import { useRaceTelemetry, useFastestLap, useF1Schedule, useF1Results } from "@f1/react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { latestRoundWithDate, type DemoInitialData, type ResultsRace } from "./data/initial";

// Real 2025 constructor colors. Teammates share a base hue; the second driver
// listed for a team (see buildDriverOptions) gets a lightened shade of it, so
// every driver on the grid still gets a visually distinct color.
const TEAM_COLORS: Readonly<Record<string, string>> = {
  "Red Bull": "#3671c6",
  McLaren: "#ff8000",
  Ferrari: "#e8002d",
  Mercedes: "#27f4d2",
  "Aston Martin": "#229971",
  "Alpine F1 Team": "#ff87bc",
  Williams: "#64c4ff",
  "RB F1 Team": "#6692ff",
  "Haas F1 Team": "#b6babd",
  Sauber: "#52e252",
};
const DEFAULT_TEAM_COLOR = "#999999";

function lighten(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const clamp = (c: number) => Math.min(255, c + amount);
  const r = clamp((n >> 16) & 255);
  const g = clamp((n >> 8) & 255);
  const b = clamp(n & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

interface DriverOption {
  driverId: string;
  code: string;
  number: string;
  name: string;
  color: string;
}

// core's resolveDriverNumber(code) correctly maps every 2025 driver code to their
// OpenF1 driver_number except STR and DOO, whose DRIVER_CODES entries collide/are
// wrong (STR:11 should be 18, DOO:87 duplicates BOT). Driver.permanentNumber from
// Jolpica is NOT a substitute: verified live, it doesn't match OpenF1's
// driver_number for this dataset (e.g. VER's permanentNumber is "3" here; the
// telemetry session uses driver_number 1, so passing "3" 404s on every request).
// Open question: fix DRIVER_CODES (STR -> 18, DOO -> 7) in @f1/core so this
// demo-side override can go away.
const DRIVER_NUMBER_OVERRIDES: Readonly<Record<string, number>> = { STR: 18, DOO: 7 };

function driverNumberArg(code: string | undefined): string {
  if (!code) return "";
  const override = DRIVER_NUMBER_OVERRIDES[code];
  return override !== undefined ? String(override) : code;
}

/** Driver picker options sourced from the loaded results, not a hand-kept roster. */
function buildDriverOptions(results: readonly RaceResult[]): DriverOption[] {
  const seenPerTeam = new Map<string, number>();
  const options: DriverOption[] = [];
  for (const result of results) {
    const driverId = result.Driver?.driverId ?? result.driverId;
    const code = result.Driver?.code;
    const number = result.Driver?.permanentNumber;
    if (!driverId || !code || !number) continue;
    const team = result.Constructor?.name ?? "Unknown";
    const base = TEAM_COLORS[team] ?? DEFAULT_TEAM_COLOR;
    const seen = seenPerTeam.get(team) ?? 0;
    seenPerTeam.set(team, seen + 1);
    const name =
      `${result.Driver?.givenName ?? ""} ${result.Driver?.familyName ?? ""}`.trim() || code;
    options.push({ driverId, code, number, name, color: seen === 0 ? base : lighten(base, 70) });
  }
  return options;
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, color: "#888", marginBottom: 4 }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: 6,
          color: "#fff",
          fontSize: 14,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function LoadingNotice({ text }: { text: string }) {
  return <div style={{ color: "#666", fontSize: 14 }}>{text}</div>;
}

function ErrorNotice({ text }: { text: string }) {
  return <div style={{ color: "#f66", fontSize: 14 }}>{text}</div>;
}

function SchedulePanel({ schedule }: { schedule: RaceTable }) {
  if (!schedule?.Races?.length) {
    return <LoadingNotice text="No races scheduled for this season yet." />;
  }

  return (
    <section
      style={{
        marginTop: 32,
        background: "#0d0d0d",
        border: "1px solid #222",
        borderRadius: 8,
        padding: 16,
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>2025 Season Schedule</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ color: "#888", textAlign: "left", fontSize: 11, textTransform: "uppercase" }}>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #222" }}>Round</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #222" }}>Date</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #222" }}>Grand Prix</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #222" }}>Circuit</th>
          </tr>
        </thead>
        <tbody>
          {schedule.Races.map((race) => (
            <tr key={`${race.round}-${race.raceName}`} style={{ color: "#ddd" }}>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #1a1a1a" }}>{race.round}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #1a1a1a" }}>{race.date}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #1a1a1a" }}>{race.raceName}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #1a1a1a" }}>
                {race.Circuit.circuitName}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** Jolpica reports lapped cars with a status like "Lapped", not a lap count behind. */
function timeOrStatusCell(result: RaceResult, leaderLaps: number): string {
  if (result.status === "Finished") return result.Time?.time ?? "—";
  const laps = Number(result.laps);
  if (Number.isFinite(laps) && leaderLaps > laps) {
    const down = leaderLaps - laps;
    return down === 1 ? "+1 Lap" : `+${down} Laps`;
  }
  return result.status ?? "—";
}

function ResultsPanel({ results, round }: { results: readonly RaceResult[]; round: number }) {
  if (results.length === 0) {
    return <LoadingNotice text={`No results available for round ${round}.`} />;
  }

  const leaderLaps = Math.max(...results.map((r) => Number(r.laps) || 0));

  return (
    <section
      style={{
        marginTop: 32,
        background: "#0d0d0d",
        border: "1px solid #222",
        borderRadius: 8,
        padding: 16,
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Latest Race Results</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ color: "#888", textAlign: "left", fontSize: 11, textTransform: "uppercase" }}>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #222" }}>Position</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #222" }}>Driver</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #222" }}>Constructor</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #222" }}>Time/Status</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #222" }}>Points</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.Driver?.driverId ?? result.driverId} style={{ color: "#ddd" }}>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #1a1a1a" }}>
                {result.position || "—"}
              </td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #1a1a1a" }}>
                {result.Driver
                  ? `${result.Driver.givenName || ""} ${result.Driver.familyName || ""}`.trim()
                  : "—"}
              </td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #1a1a1a" }}>
                {result.Constructor?.name || "—"}
              </td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #1a1a1a" }}>
                {timeOrStatusCell(result, leaderLaps)}
              </td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #1a1a1a" }}>
                {result.points || "0"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

interface TelemetryPoint extends CarData {
  driverId: string;
  seconds: number;
}

// Elapsed seconds since this driver's own first sample, not the merged array's
// index, so a sparse driver (fewer samples, e.g. after rate-limited retries)
// still draws across its own lap duration instead of a stub near x=0.
function toTelemetryPoints(data: readonly CarData[] | null, driverId: string): TelemetryPoint[] {
  if (!data || data.length === 0) return [];
  const startMs = new Date(data[0].date).getTime();
  return data.map((d) => ({
    ...d,
    driverId,
    seconds: (new Date(d.date).getTime() - startMs) / 1000,
  }));
}

function SpeedChart({
  data,
  driverMeta,
}: {
  data: TelemetryPoint[];
  driverMeta: Record<string, { code: string; color: string }>;
}) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
        }}
      >
        Select drivers to compare
      </div>
    );
  }

  const driversInData = [...new Set(data.map((d) => d.driverId))];
  const maxSeconds = Math.max(...data.map((d) => d.seconds));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis
          dataKey="seconds"
          type="number"
          domain={[0, maxSeconds]}
          tick={{ fontSize: 10 }}
          stroke="#444"
          tickLine={false}
          tickFormatter={(v) => `${v.toFixed(0)}s`}
        />
        <YAxis
          tick={{ fontSize: 10 }}
          stroke="#444"
          domain={[0, "auto"]}
          tickFormatter={(v) => `${Math.round(v)}`}
        />
        <Tooltip
          contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }}
          labelFormatter={(v) => `${v.toFixed(1)}s`}
          formatter={(v: number, name: string) => [`${Math.round(v)} km/h`, name]}
        />
        <Legend />
        {driversInData.map((id) => {
          const meta = driverMeta[id];
          const drvData = data.filter((d) => d.driverId === id);
          return (
            <Line
              key={id}
              type="monotone"
              dataKey="speed"
              data={drvData}
              stroke={meta?.color || "#fff"}
              strokeWidth={1.5}
              dot={false}
              name={meta?.code || id}
              isAnimationActive={false}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function App({ initialData }: { initialData?: DemoInitialData }) {
  const [driver1Id, setDriver1Id] = useState<string | undefined>(undefined);
  const [driver2Id, setDriver2Id] = useState<string | undefined>(undefined);
  const [lap, setLap] = useState<number>(1);

  const {
    data: schedule,
    isLoading: scheduleLoading,
    error: scheduleError,
  } = useF1Schedule(2025, { initialData: initialData?.schedule });

  // The hook API can't be called conditionally, so round 1 is a transient bootstrap
  // value used only until the schedule (from initialData or the fetch above) is known.
  const latestRound =
    initialData?.latestRound ?? (schedule ? latestRoundWithDate(schedule) : 1);

  const {
    data: resultsData,
    isLoading: resultsLoading,
    error: resultsError,
  } = useF1Results(2025, latestRound, { initialData: initialData?.latestResults });
  const latestRace = resultsData?.[0] as ResultsRace | undefined;
  const results = latestRace?.Results ?? [];

  const driverOptions = useMemo(() => buildDriverOptions(results), [results]);
  const effectiveDriver1Id = driver1Id ?? driverOptions[0]?.driverId;
  // The second select's own options exclude driver 1, so this can only diverge
  // right after driver 1 changes onto the driver 2 was showing; fall back off it.
  const driver2Options = driverOptions.filter((d) => d.driverId !== effectiveDriver1Id);
  const effectiveDriver2Id =
    driver2Id && driver2Id !== effectiveDriver1Id ? driver2Id : driver2Options[0]?.driverId;

  const drv1 = driverOptions.find((d) => d.driverId === effectiveDriver1Id);
  const drv2 = driverOptions.find((d) => d.driverId === effectiveDriver2Id);

  const { lap: fastest1 } = useFastestLap(2025, "abu dhabi", driverNumberArg(drv1?.code), "race", 1276);
  const { lap: fastest2 } = useFastestLap(2025, "abu dhabi", driverNumberArg(drv2?.code), "race", 1276);

  const {
    data: t1,
    isLoading: l1,
    error: error1,
  } = useRaceTelemetry(2025, "abu dhabi", driverNumberArg(drv1?.code), "race", 1276, lap);
  const {
    data: t2,
    isLoading: l2,
    error: error2,
  } = useRaceTelemetry(2025, "abu dhabi", driverNumberArg(drv2?.code), "race", 1276, lap);

  const isLoading = l1 || l2;

  // useAsyncResource keeps the last successful `data` around after a later request
  // errors (open question: reset data to null on error in @f1/react), so a driver
  // whose current request failed must be excluded here rather than trusting `t1`/`t2`
  // directly — otherwise a failed lap-48 fetch would silently redraw lap 1's trace.
  const combined = useMemo(() => {
    const id1 = drv1?.driverId;
    const id2 = drv2?.driverId;
    return [
      ...(error1 || !id1 ? [] : toTelemetryPoints(t1, id1)),
      ...(error2 || !id2 ? [] : toTelemetryPoints(t2, id2)),
    ];
  }, [t1, t2, error1, error2, drv1?.driverId, drv2?.driverId]);

  const driverMeta = useMemo(() => {
    const meta: Record<string, { code: string; color: string }> = {};
    if (drv1) meta[drv1.driverId] = { code: drv1.code, color: drv1.color };
    if (drv2) meta[drv2.driverId] = { code: drv2.code, color: drv2.color };
    return meta;
  }, [drv1, drv2]);

  const lapOptions = Array.from({ length: 58 }, (_, i) => ({
    value: String(i + 1),
    label: `Lap ${i + 1}`,
  }));

  const driver1SelectOptions = driverOptions.map((d) => ({
    value: d.driverId,
    label: `${d.number} - ${d.code}`,
  }));
  const driver2SelectOptions = driver2Options.map((d) => ({
    value: d.driverId,
    label: `${d.number} - ${d.code}`,
  }));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>F1 Speed Comparison</h1>
        <p style={{ color: "#666", fontSize: 14 }}>Lap {lap} - 2025 Abu Dhabi</p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "200px 200px 200px",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <Select
          label="Driver 1"
          value={effectiveDriver1Id ?? ""}
          options={driver1SelectOptions}
          onChange={setDriver1Id}
        />
        <Select
          label="Driver 2"
          value={effectiveDriver2Id ?? ""}
          options={driver2SelectOptions}
          onChange={setDriver2Id}
        />
        <Select
          label="Lap"
          value={String(lap)}
          options={lapOptions}
          onChange={(v) => setLap(parseInt(v))}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => fastest1 && setLap(fastest1)}
            style={{
              padding: "8px 12px",
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: 6,
              color: drv1?.color || "#fff",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Fastest: {fastest1}
          </button>
          <button
            onClick={() => fastest2 && setLap(fastest2)}
            style={{
              padding: "8px 12px",
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: 6,
              color: drv2?.color || "#fff",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Fastest: {fastest2}
          </button>
        </div>
      </div>

      {scheduleError && <ErrorNotice text={`Failed to load season schedule: ${scheduleError.message}`} />}
      {scheduleLoading && !schedule && <LoadingNotice text="Loading season schedule..." />}
      {schedule && <SchedulePanel schedule={schedule} />}

      {resultsError && <ErrorNotice text={`Failed to load race results: ${resultsError.message}`} />}
      {resultsLoading && !resultsData && <LoadingNotice text="Loading race results..." />}
      {resultsData && <ResultsPanel results={results} round={latestRound} />}

      {isLoading && (
        <div
          style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          Loading...
        </div>
      )}

      {!isLoading && (
        <section>
          {(error1 || error2) && (
            <div style={{ marginBottom: 8 }}>
              {error1 && (
                <ErrorNotice text={`${drv1?.code ?? "Driver 1"}: no telemetry for lap ${lap} (${error1.message})`} />
              )}
              {error2 && (
                <ErrorNotice text={`${drv2?.code ?? "Driver 2"}: no telemetry for lap ${lap} (${error2.message})`} />
              )}
            </div>
          )}
          <div
            style={{
              background: "#0d0d0d",
              border: "1px solid #222",
              borderRadius: 8,
              padding: 16,
            }}
          >
            <SpeedChart data={combined} driverMeta={driverMeta} />
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 24, justifyContent: "center" }}>
            <span style={{ color: drv1?.color || "#fff" }}>
              {drv1?.code ?? "—"}: {error1 ? 0 : t1?.length || 0} pts
            </span>
            <span style={{ color: drv2?.color || "#fff" }}>
              {drv2?.code ?? "—"}: {error2 ? 0 : t2?.length || 0} pts
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
