import { useState } from "react";
import type { CarData } from "@f1/core";
import { useRaceTelemetry, useFastestLap } from "@f1/react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const DRIVERS = [
  { code: "VER", name: "Max Verstappen", number: 1, color: "#1e41ff" },
  { code: "NOR", name: "Lando Norris", number: 4, color: "#ff8700" },
  { code: "LEC", name: "Charles Leclerc", number: 16, color: "#ff0000" },
  { code: "HAM", name: "Lewis Hamilton", number: 44, color: "#00d4ff" },
  { code: "PIA", name: "Oscar Piastri", number: 81, color: "#ffb700" },
  { code: "RUS", name: "George Russell", number: 63, color: "#00ff00" },
  { code: "ALO", name: "Fernando Alonso", number: 14, color: "#00d4ff" },
  { code: "GAS", name: "Pierre Gasly", number: 10, color: "#ff8700" },
  { code: "AGR", name: "Alex Albon", number: 23, color: "#ff8700" },
  { code: "COL", name: "Alex Colapinto", number: 43, color: "#ff8700" },
  { code: "TSU", name: "Yuki Tsunoda", number: 22, color: "#ff8700" },
  { code: "LAW", name: "Jack Lawson", number: 30, color: "#ff8700" },
  { code: "BOT", name: "Valtteri Bottas", number: 87, color: "#ff8700" },
  { code: "ZHO", name: "Zhou Guanyu", number: 24, color: "#ff8700" },
  { code: "MAG", name: "Kevin Magnussen", number: 27, color: "#ff8700" },
  { code: "BEA", name: "Engel", number: 5, color: "#ff8700" },
  { code: "DOO", name: "Oliver Bearman", number: 87, color: "#ff8700" },
  { code: "STR", name: "Sergio Perez", number: 11, color: "#ff8700" },
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

interface TelemetryPoint extends CarData {
  driver: string;
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

  const chartData = data.map((d, i) => ({
    seconds: i * 0.27,
    speed: d.speed,
    driver: d.driver,
  }));

  const driversInData = [...new Set(data.map((d) => d.driver))];
  const maxSeconds = data.length * 0.27;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
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
          const drvData = chartData.filter((d) => d.driver === drv);
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

export default function App() {
  const [driver1, setDriver1] = useState("VER");
  const [driver2, setDriver2] = useState("NOR");
  const [lap, setLap] = useState<number>(1);

  const drv1 = DRIVERS.find((d) => d.code === driver1);
  const drv2 = DRIVERS.find((d) => d.code === driver2);

  const { lap: fastest1 } = useFastestLap(2025, "abu dhabi", driver1, "race", 1276);
  const { lap: fastest2 } = useFastestLap(2025, "abu dhabi", driver2, "race", 1276);

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
    ...(t1 || []).map((d) => ({ ...d, driver: driver1 })),
    ...(t2 || []).map((d) => ({ ...d, driver: driver2 })),
  ].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

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
