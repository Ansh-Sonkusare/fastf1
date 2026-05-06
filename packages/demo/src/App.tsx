import { useState } from "react";
import type { CarData, Stint } from "@f1/core";
import { useRaceTelemetry, useRaceStints } from "@f1/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const RACES = [
  { year: 2026, name: "Miami", value: "miami" },
  { year: 2025, name: "Abu Dhabi", value: "abu dhabi" },
];

const DRIVERS = [
  { code: "VER", name: "Max Verstappen", color: "#1e41ff" },
  { code: "NOR", name: "Lando Norris", color: "#ff8700" },
  { code: "LEC", name: "Charles Leclerc", color: "#ff0000" },
  { code: "HAM", name: "Lewis Hamilton", color: "#00d4ff" },
  { code: "PIA", name: "Oscar Piastri", color: "#ffb700" },
];

interface TelemetryPoint extends CarData {
  driver: string;
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

function SpeedChart({ data }: { data: TelemetryPoint[] }) {
  if (!data.length) {
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

  const sampled = data.filter((d) => d.speed && d.speed > 0).map((d, i) => ({ ...d, index: i }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={sampled}>
        <XAxis dataKey="index" tick={{ fontSize: 10 }} stroke="#444" tickLine={false} />
        <YAxis
          tick={{ fontSize: 10 }}
          stroke="#444"
          domain={[0, "auto"]}
          tickFormatter={(v) => `${Math.round(v)}`}
        />
        <Tooltip
          contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }}
          formatter={(v: number) => [`${Math.round(v)} km/h`, "Speed"]}
        />
        <Legend />
        {DRIVERS.map((drv) => {
          const hasData = sampled.some((d) => d.driver === drv.code);
          if (!hasData) return null;
          return (
            <Line
              key={drv.code}
              type="monotone"
              dataKey="speed"
              data={sampled.filter((d) => d.driver === drv.code)}
              stroke={drv.color}
              strokeWidth={1.5}
              dot={false}
              name={drv.code}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}

function StintChart({ data }: { data: Stint[] }) {
  if (!data?.length) {
    return (
      <div
        style={{
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
        }}
      >
        No stint data
      </div>
    );
  }

  const colors: Record<string, string> = {
    SOFT: "#ff3333",
    MEDIUM: "#fff200",
    HARD: "#c0c0c0",
    INTER: "#3498db",
    WET: "#2980b9",
  };
  const chartData = data.map((s) => ({ compound: s.compound, laps: s.lap_end - s.lap_start + 1 }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} layout="vertical">
        <XAxis type="number" dataKey="laps" stroke="#444" fontSize={10} />
        <YAxis type="category" dataKey="compound" stroke="#444" fontSize={10} width={60} />
        <Tooltip
          contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }}
          formatter={(v: number) => [`${v} laps`, "Duration"]}
        />
        <Bar dataKey="laps" fill="#fff200" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function App() {
  const [year, setYear] = useState(2026);
  const [raceName, setRaceName] = useState("miami");
  const [driver1, setDriver1] = useState("VER");
  const [driver2, setDriver2] = useState("NOR");

  const { data: t1, isLoading: l1 } = useRaceTelemetry(year, raceName, driver1);
  const { data: t2, isLoading: l2 } = useRaceTelemetry(year, raceName, driver2);
  const { data: stints, isLoading: l3 } = useRaceStints(year, raceName, driver1);

  const isLoading = l1 || l2 || l3;
  const combined: TelemetryPoint[] = [
    ...(t1 || []).map((d) => ({ ...d, driver: driver1 })),
    ...(t2 || []).map((d) => ({ ...d, driver: driver2 })),
  ].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const driverOptions = DRIVERS.map((d) => ({ value: d.code, label: `${d.code} - ${d.name}` }));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>F1 Telemetry Comparison</h1>
        <p style={{ color: "#666", fontSize: 14 }}>Compare speed traces between drivers</p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <Select
          label="Race"
          value={raceName}
          options={RACES.map((r) => ({ value: r.value, label: `${r.year} ${r.name}` }))}
          onChange={setRaceName}
        />
        <Select label="Driver 1" value={driver1} options={driverOptions} onChange={setDriver1} />
        <Select label="Driver 2" value={driver2} options={driverOptions} onChange={setDriver2} />
      </div>

      {isLoading && (
        <div
          style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          Loading...
        </div>
      )}

      {!isLoading && (
        <>
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, color: "#888" }}>
              SPEED TRACE
            </h2>
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
          </section>
          <section>
            <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, color: "#888" }}>
              TYRE STINTS - {driver1}
            </h2>
            <div
              style={{
                background: "#0d0d0d",
                border: "1px solid #222",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <StintChart data={stints || []} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
