import type { PanelProps } from "../../app/types";
import { pitLanePassLaps, realPitStops } from "../../app/timeline";
import { combine, useOpenF1 } from "../../data/useOpenF1";
import { AsyncView, MeasuredLegend, PanelFrame, Swatch } from "../../ui/primitives";
import { color } from "../../ui/tokens";
import { filterChartLaps, shapeLapTimes, type LapTimeViewModel } from "./lapTimes";

export default function LapTimes({ session, lap, focus, drivers }: PanelProps) {
  const laps = useOpenF1("laps", session.sessionKey);
  const pits = useOpenF1("pit", session.sessionKey);
  const stints = useOpenF1("stints", session.sessionKey);
  const raceControl = useOpenF1("race_control", session.sessionKey);
  const combined = combine(laps, pits, stints, raceControl);

  return (
    <PanelFrame num="04" title="Lap times" right={<MeasuredLegend />}>
      <AsyncView state={combined} isEmpty={([rows]) => rows.length === 0}>
        {([lapRows, pitRows, stintRows, rcRows]) => {
          const pitStops = realPitStops(pitRows, stintRows, pitLanePassLaps(rcRows));
          const viewModels = shapeLapTimes(lapRows, session.sessionKey, pitStops, rcRows).filter(
            (v) => v.lapNumber <= lap,
          );
          return <LapTimesChart viewModels={viewModels} focus={focus} drivers={drivers} />;
        }}
      </AsyncView>
    </PanelFrame>
  );
}

function LapTimesChart({
  viewModels,
  focus,
  drivers,
}: {
  viewModels: LapTimeViewModel[];
  focus: PanelProps["focus"];
  drivers: PanelProps["drivers"];
}) {
  const width = 700;
  const height = 260;
  const padding = { top: 12, right: 16, bottom: 24, left: 40 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const chartLaps = filterChartLaps(viewModels).filter((v) => v.duration != null);
  if (chartLaps.length === 0) {
    return <div style={{ padding: 16, opacity: 0.5, color: color.dim }}>No lap data yet.</div>;
  }

  const durations = chartLaps.map((v) => v.duration as number);
  const minD = Math.min(...durations);
  const maxD = Math.max(...durations);
  const maxLap = Math.max(...viewModels.map((v) => v.lapNumber));
  const x = (lapNumber: number) => padding.left + (lapNumber / maxLap) * plotW;
  const y = (duration: number) =>
    padding.top + plotH - ((duration - minD) / (maxD - minD || 1)) * plotH;

  const pathFor = (driverNumber: number | null) => {
    if (driverNumber == null) return "";
    const pts = filterChartLaps(viewModels)
      .filter((v) => v.driverNumber === driverNumber && v.duration != null)
      .sort((a, b) => a.lapNumber - b.lapNumber);
    return pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(v.lapNumber)},${y(v.duration as number)}`).join(" ");
  };

  const scBands = (() => {
    const slowed = viewModels.filter((v) => v.isSlowed);
    if (slowed.length === 0) return null;
    const laps = [...new Set(slowed.map((v) => v.lapNumber))].sort((a, b) => a - b);
    return { start: x(laps[0]), end: x(laps[laps.length - 1] + 1) };
  })();

  const codeOf = (n: number | null) => (n == null ? null : drivers.get(n)?.code ?? String(n));
  const colorOf = (n: number | null) => (n == null ? color.text : drivers.get(n)?.color ?? color.text);
  const bColor = focus.a != null && colorOf(focus.b) === colorOf(focus.a) ? color.text : colorOf(focus.b);

  return (
    <div style={{ padding: 12 }}>
      <svg width={width} height={height} role="img" aria-label="Lap times chart">
        {scBands && (
          <rect x={scBands.start} y={padding.top} width={scBands.end - scBands.start} height={plotH} fill={color.yellow} opacity={0.15} />
        )}
        <path d={pathFor(focus.a)} fill="none" stroke={colorOf(focus.a)} strokeWidth={2} />
        <path d={pathFor(focus.b)} fill="none" stroke={bColor} strokeWidth={1.5} strokeDasharray="6 4" />
        {viewModels
          .filter((v) => v.isPitLap && (v.driverNumber === focus.a || v.driverNumber === focus.b) && v.duration != null)
          .map((v) => (
            <rect
              key={`${v.driverNumber}-${v.lapNumber}`}
              x={x(v.lapNumber) - 3}
              y={y(v.duration as number) - 3}
              width={6}
              height={6}
              fill={colorOf(v.driverNumber)}
              transform={`rotate(45 ${x(v.lapNumber)} ${y(v.duration as number)})`}
            />
          ))}
      </svg>
      <div style={{ display: "flex", gap: 12, paddingTop: 4 }}>
        {codeOf(focus.a) && <Swatch tone={colorOf(focus.a)}>{codeOf(focus.a)}</Swatch>}
        {codeOf(focus.b) && <Swatch tone={bColor}>{codeOf(focus.b)}</Swatch>}
        {scBands && <Swatch tone={color.yellow}>SC</Swatch>}
      </div>
    </div>
  );
}
