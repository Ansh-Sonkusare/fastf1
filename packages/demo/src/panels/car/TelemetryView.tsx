import type { MouseEvent } from "react";
import { color, font } from "../../ui/tokens";
import { TELEMETRY_VIEW, type TelemetryView as TelemetryViewModel } from "./telemetry";

interface TelemetryViewProps {
  readonly view: TelemetryViewModel;
  readonly colorA: string;
  readonly colorB: string;
  readonly hover: number | null;
  readonly onHover: (index: number | null) => void;
}

const STROKE = {
  A: (a: string) => ({ stroke: a, strokeWidth: 1.6 }),
  B: (_: string, b: string) => ({ stroke: b, strokeWidth: 1.3, strokeDasharray: "4 3" }),
  Δ: () => ({ stroke: color.text, strokeWidth: 1.6 }),
} as const;

export function TelemetryView({ view, colorA, colorB, hover, onHover }: TelemetryViewProps) {
  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onHover(view.indexAt(((e.clientX - rect.left) / rect.width) * TELEMETRY_VIEW.width));
  };

  const curX = hover !== null ? view.xOf(hover) : null;

  return (
    <svg
      role="img"
      aria-label="Telemetry compare"
      viewBox="0 0 900 350"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => onHover(null)}
      style={{ width: "100%", display: "block", cursor: "crosshair" }}
    >
      {view.drs.map((z, i) => (
        <g key={`drs-${i}`}>
          <rect x={z.x} y={8} width={z.w} height={124} style={{ fill: color.drs, opacity: 0.07 }} />
          <text x={z.x + z.w / 2} y={20} style={{ fill: color.drs, font: `600 9px ${font.mono}`, textAnchor: "middle" }}>
            DRS
          </text>
        </g>
      ))}
      {view.lanes.map((lane, i) => (
        <g key={`lane-${i}`}>
          <line x1={40} x2={890} y1={lane.y} y2={lane.y} style={{ stroke: color.border }} />
          <text x={4} y={lane.labelY} style={{ fill: color.dim, font: `500 10px ${font.mono}` }}>
            {lane.label}
          </text>
        </g>
      ))}
      {view.sectors.map((sector, i) => (
        <g key={`sector-${i}`}>
          <line x1={sector.x} x2={sector.x} y1={8} y2={342} style={{ stroke: "#2a3038", strokeDasharray: "3 3" }} />
          <text x={sector.labelX} y={346} style={{ fill: color.dim, font: `500 9px ${font.mono}`, textAnchor: "middle" }}>
            {sector.label}
          </text>
        </g>
      ))}
      <line x1={40} x2={890} y1={view.zeroY} y2={view.zeroY} style={{ stroke: "#3a414a" }} />
      {view.paths.map((path, i) => (
        <path key={i} d={path.d} style={{ fill: "none", strokeLinejoin: "round", ...STROKE[path.who](colorA, colorB) }} />
      ))}
      {curX !== null && <line x1={curX} x2={curX} y1={8} y2={336} style={{ stroke: color.text, opacity: 0.6 }} />}
    </svg>
  );
}

const LEGEND = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontWeight: 700,
  fontSize: 13,
} as const;

interface TelemetryHeaderProps {
  readonly codeA: string;
  readonly codeB: string;
  readonly colorA: string;
  readonly colorB: string;
  readonly text: string;
}

export function TelemetryHeader({ codeA, codeB, colorA, colorB, text }: TelemetryHeaderProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
      <span style={LEGEND}>
        <span style={{ width: "16px", height: "2px", background: colorA }} />A {codeA}
      </span>
      <span style={LEGEND}>
        <span style={{ width: "16px", height: 0, borderTop: `2px dashed ${colorB}` }} />B {codeB}
      </span>
      <div style={{ flex: 1 }} />
      <span style={{ font: `500 11px/1 ${font.mono}`, color: color.textMuted }}>{text}</span>
    </div>
  );
}
