import { color, font, type } from "../../../ui/tokens";
import type { WeatherViewModel } from "./shape";

export interface WeatherProps {
  /** Weather readings up to the replay's current lap, ordered by date. */
  weather: WeatherViewModel[];
  /** Wall mode: bigger cells (matches the header's other big-mode cells). */
  big?: boolean;
}

interface Metric {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  readonly data: readonly number[];
  readonly lineColor: string;
}

/**
 * The header's AIR/TRACK/WIND/RAIN cells: each a label, the latest reading,
 * and a sparkline over the session so far with a trend arrow when the value
 * has moved. Matches undercut-terminal.dc.html's header weather cells,
 * dividers included; `Header.tsx` supplies the outer left border.
 */
export function Weather({ weather, big = false }: WeatherProps) {
  if (weather.length === 0) return <div style={{ padding: "0 12px", font: type.label, color: color.dim }}>NO WEATHER DATA</div>;

  const latest = weather[weather.length - 1]!;
  const candidates: (Metric | false)[] = [
    latest.airTemperature !== undefined && {
      key: "air",
      label: "Air",
      value: latest.airTemperature,
      unit: "°C",
      data: weather.map((w) => w.airTemperature).filter((v): v is number => v !== undefined),
      lineColor: color.textSoft,
    },
    latest.trackTemperature !== undefined && {
      key: "track",
      label: "Track",
      value: latest.trackTemperature,
      unit: "°C",
      data: weather.map((w) => w.trackTemperature).filter((v): v is number => v !== undefined),
      lineColor: color.amber,
    },
    latest.windSpeed !== undefined && {
      key: "wind",
      label: "Wind",
      value: latest.windSpeed,
      unit: " m/s",
      data: weather.map((w) => w.windSpeed).filter((v): v is number => v !== undefined),
      lineColor: color.label,
    },
    latest.rainfall !== undefined && {
      key: "rain",
      label: "Rain",
      value: latest.rainfall,
      unit: "",
      data: weather.map((w) => w.rainfall).filter((v): v is number => v !== undefined),
      lineColor: color.predicted,
    },
  ];
  const metrics = candidates.filter((m): m is Metric => m !== false);

  return (
    <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
      {metrics.map((m, i) => (
        <WeatherCell key={m.key} metric={m} big={big} divider={i > 0} />
      ))}
    </div>
  );
}

function WeatherCell({ metric, big, divider }: { metric: Metric; big: boolean; divider: boolean }) {
  const { label, value, unit, data, lineColor } = metric;
  const trendUp = data.length >= 2 ? data[data.length - 1]! >= data[0]! : null;
  const changed = data.length >= 2 && data[0] !== data[data.length - 1];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: "100%",
        padding: big ? "0 14px" : "0 12px",
        borderLeft: divider ? `1px solid ${color.border}` : undefined,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <span style={{ font: `500 ${big ? 13 : 10}px/1 ${font.sans}`, letterSpacing: ".07em", textTransform: "uppercase", color: color.label }}>{label}</span>
        <span style={{ font: `500 ${big ? 22 : 13}px/1 ${font.mono}`, color: color.textSoft, whiteSpace: "nowrap" }}>
          {value.toFixed(1)}
          {unit}
        </span>
      </div>
      {changed && (
        <>
          <svg
            viewBox="0 0 100 24"
            preserveAspectRatio="none"
            style={{ width: big ? 60 : 40, height: big ? 27 : 18, display: "block", flexShrink: 0 }}
          >
            <path d={sparklinePath(data)} style={{ fill: "none", stroke: lineColor, strokeWidth: 1.5, vectorEffect: "non-scaling-stroke" }} />
          </svg>
          <span style={{ font: `700 ${big ? 13 : 10}px/1 ${font.mono}`, color: lineColor }}>{trendUp ? "▲" : "▼"}</span>
        </>
      )}
    </div>
  );
}

/** Normalizes the last 24 readings into a 100x24 sparkline path. */
function sparklinePath(data: readonly number[]): string {
  const window = data.slice(-24);
  const min = Math.min(...window);
  const max = Math.max(...window);
  const range = max - min || 1;
  return window
    .map((v, i) => `${i ? "L" : "M"}${((i / (window.length - 1 || 1)) * 100).toFixed(1)},${(22 - ((v - min) / range) * 20).toFixed(1)}`)
    .join("");
}

export default Weather;
