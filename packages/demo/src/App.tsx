import { useState } from "react";
import type { CarData, RaceResult, RaceTable } from "@f1/core";
import { useRaceTelemetry, useFastestLap, useF1Schedule, useF1Results } from "@f1/react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { DemoInitialData } from "./data/initial";

const DRIVERS = [
  { code: "VER", name: "Max Verstappen", number: 1, color: "#1e41ff" },
  { code: "NOR", name: "Lando Norris", number: 4, color: "#ff8700" },
  { code: "LEC", name: "Charles Leclerc", number: 16, color: "#ff0000" },
  { code: "HAM", name: "Lewis Hamilton", number: 44, color: "#00d4ff" },
  { code: "PIA", name: "Oscar Piastri", number: 81, color: "#ffb700" },
  { code: "RUS", name: "George Russell", number: 63, color: "#00ff00" },
  { code: "ALO", name: "Fernando Alonso", number: 14, color: "#00d4ff" },
  { code: "GAS", name: "Pierre Gasly", number: 10, color: "#ff8700" },
  { code: "ALB", name: "Alex Albon", number: 23, color: "#ff8700" },
  { code: "COL", name: "Alex Colapinto", number: 43, color: "#ff8700" },
  { code: "TSU", name: "Yuki Tsunoda", number: 22, color: "#ff8700" },
  { code: "LAW", name: "Jack Lawson", number: 30, color: "#ff8700" },
  { code: "BOT", name: "Valtteri Bottas", number: 87, color: "#ff8700" },
  { code: "ZHO", name: "Zhou Guanyu", number: 24, color: "#ff8700" },
  { code: "MAG", name: "Kevin Magnussen", number: 27, color: "#ff8700" },
  { code: "BEA", name: "Oliver Bearman", number: 5, color: "#ff8700" },
  { code: "DOO", name: "Jack Doohan", number: 7, color: "#ff8700" },
  { code: "STR", name: "Lance Stroll", number: 18, color: "#ff8700" },
  { code: "DEV", name: "Dev", number: 99, color: "#ff8700" },
];

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

function SchedulePanel({ schedule }: { schedule: RaceTable }) {
  if (!schedule?.Races?.length) {
    return (
      <div style={{ color: "#666", fontSize: 14 }}>No races scheduled for this season yet.</div>
    );
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

function ResultsPanel({
  results,
  round,
}: {
  results: readonly RaceResult[];
  round: number;
}) {
  if (results.length === 0) {
    return (
      <div style={{ color: "#666", fontSize: 14 }}>No results available for round {round}.</div>
    );
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
          {results.map((result, i) => (
            <tr key={i} style={{ color: "#ddd" }}>
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
                {result.Time?.time || result.status || "—"}
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
  driver: string;
  seconds: number;
}

// Elapsed seconds since this driver's own first sample, not the merged array's
// index, so a sparse driver (fewer samples, e.g. after rate-limited retries)
// still draws across its own lap duration instead of a stub near x=0.
function toTelemetryPoints(data: readonly CarData[] | null, driver: string): TelemetryPoint[] {
  if (!data || data.length === 0) return [];
  const startMs = new Date(data[0].date).getTime();
  return data.map((d) => ({
    ...d,
    driver,
    seconds: (new Date(d.date).getTime() - startMs) / 1000,
  }));
}

function SpeedChart({ data }: { data: TelemetryPoint[] }) {
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

  const driversInData = [...new Set(data.map((d) => d.driver))];
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
        {driversInData.map((drv) => {
          const drvInfo = DRIVERS.find((d) => d.code === drv);
          const drvData = data.filter((d) => d.driver === drv);
          return (
            <Line
              key={drv}
              type="monotone"
              dataKey="speed"
              data={drvData}
              stroke={drvInfo?.color || "#fff"}
              strokeWidth={1.5}
              dot={false}
              name={drv}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function App({ initialData }: { initialData?: DemoInitialData }) {
  const [driver1, setDriver1] = useState("VER");
  const [driver2, setDriver2] = useState("NOR");
  const [lap, setLap] = useState<number>(1);

  const drv1 = DRIVERS.find((d) => d.code === driver1);
  const drv2 = DRIVERS.find((d) => d.code === driver2);

  const { lap: fastest1 } = useFastestLap(2025, "abu dhabi", driver1, "race", 1276);
  const { lap: fastest2 } = useFastestLap(2025, "abu dhabi", driver2, "race", 1276);

  const latestRound = initialData?.latestRound ?? 24;

  const { data: schedule } = useF1Schedule(2025, { initialData: initialData?.schedule });

  const { data: resultsData } = useF1Results(2025, latestRound, {
    initialData: initialData?.latestResults,
  });
  // getRaceResults resolves an array of races for the round; the finishers live on
  // Races[0].Results. useF1Results types data as readonly unknown[] (open question:
  // it should be readonly Race[] from @f1/core), so this is the single narrowing site.
  const latestRace = resultsData?.[0] as { Results?: readonly RaceResult[] } | undefined;
  const results = latestRace?.Results ?? [];

  const { data: t1, isLoading: l1 } = useRaceTelemetry(
    2025,
    "abu dhabi",
    driver1,
    "race",
    1276,
    lap,
  );
  const { data: t2, isLoading: l2 } = useRaceTelemetry(
    2025,
    "abu dhabi",
    driver2,
    "race",
    1276,
    lap,
  );

  const isLoading = l1 || l2;

  const combined: TelemetryPoint[] = [
    ...toTelemetryPoints(t1, driver1),
    ...toTelemetryPoints(t2, driver2),
  ];

  const lapOptions = Array.from({ length: 58 }, (_, i) => ({
    value: String(i + 1),
    label: `Lap ${i + 1}`,
  }));

  const driverOptions = DRIVERS.map((d) => ({
    value: d.code,
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
        <Select label="Driver 1" value={driver1} options={driverOptions} onChange={setDriver1} />
        <Select label="Driver 2" value={driver2} options={driverOptions} onChange={setDriver2} />
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

      {schedule && <SchedulePanel schedule={schedule} />}

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
          <div
            style={{
              background: "#0d0d0d",
              border: "1px solid #222",
              borderRadius: 8,
              padding: 16,
            }}
          >
            <SpeedChart data={combined} />
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 24, justifyContent: "center" }}>
            <span style={{ color: drv1?.color || "#fff" }}>
              {driver1}: {t1?.length || 0} pts
            </span>
            <span style={{ color: drv2?.color || "#fff" }}>
              {driver2}: {t2?.length || 0} pts
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
