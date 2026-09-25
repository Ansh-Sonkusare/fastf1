import { color, font } from "../../ui/tokens";
import type { TrackView } from "./track";

interface TrackMapViewProps {
  readonly view: TrackView;
  readonly drivers: ReadonlyMap<number, { code: string; color: string }>;
  /** Wall mode: bigger dots and labels (matches undercut-terminal.dc.html). */
  readonly big?: boolean;
}

/** Focus ring radius is fixed regardless of mode, per undercut-terminal.dc.html. */
const RING_RADIUS = 13;

export function TrackMapView({ view, drivers, big = false }: TrackMapViewProps) {
  const carRadius = big ? 8 : 6.5;
  const labelFont = big ? 15 : 12;
  const labelAt: readonly [number, number] = big ? [12, -11] : [10.5, -9.5];

  return (
    <svg role="img" aria-label="Track map" viewBox="0 0 460 300" style={{ width: "100%", display: "block", padding: "6px" }}>
      <path d={view.outline} style={{ fill: "none", stroke: "#252b33", strokeWidth: 12, strokeLinejoin: "round" }} />
      {view.sectors.map((sector) => (
        <g key={sector.label}>
          <path d={sector.d} style={{ fill: "none", stroke: color.dim, strokeWidth: 2.5, strokeLinejoin: "round" }} />
          <text
            x={sector.labelAt[0]}
            y={sector.labelAt[1]}
            style={{ fill: color.label, font: `600 11px ${font.mono}`, textAnchor: "middle" }}
          >
            {sector.label}
          </text>
        </g>
      ))}
      {view.drs.map((d, i) => (
        <path
          key={`drs-${i}`}
          d={d}
          style={{
            fill: "none",
            stroke: color.drs,
            strokeWidth: 5,
            opacity: 0.55,
            strokeLinecap: "round",
          }}
        />
      ))}
      {view.yellows.map((y) => (
        <path
          key={`yellow-${y.sector}`}
          d={y.d}
          style={{
            fill: "none",
            stroke: color.yellow,
            strokeWidth: y.level === "DOUBLE YELLOW" ? 6 : 4,
            opacity: 0.7,
            strokeLinecap: "round",
          }}
        />
      ))}
      <rect x={view.startFinish[0] - 2} y={view.startFinish[1] - 8} width={4} height={16} style={{ fill: color.text }} />
      {view.cars.map((car) => {
        const driver = drivers.get(car.number);
        const isRoleA = car.role === "A";
        return (
          <g key={`car-${car.number}`} data-car={car.number} style={{ transform: `translate(${car.at[0]}px,${car.at[1]}px)` }}>
            {car.role && (
              <circle cx={0} cy={0} r={RING_RADIUS} style={{ fill: "none", stroke: isRoleA ? color.accent : color.label, strokeWidth: 1.5 }} />
            )}
            <circle cx={0} cy={0} r={carRadius} style={{ fill: driver?.color ?? color.label, stroke: color.bg, strokeWidth: 1.5 }} />
            {car.labelled && driver && (
              <text
                x={labelAt[0]}
                y={labelAt[1]}
                style={{
                  fill: isRoleA ? "#ffffff" : color.textMuted,
                  font: `700 ${labelFont}px ${font.mono}`,
                }}
              >
                {driver.code}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function TrackMapLegend({ big = false }: { big?: boolean }) {
  return (
    <>
      <LegendSwatch tone={color.drs} big={big}>
        DRS
      </LegendSwatch>
      <LegendSwatch tone={color.yellow} big={big}>
        YELLOW
      </LegendSwatch>
    </>
  );
}

function LegendSwatch({ tone, big, children }: { tone: string; big: boolean; children: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: big ? 8 : 6, font: `500 ${big ? 14 : 11}px/1 ${font.mono}`, color: color.label }}>
      <span style={{ width: big ? 18 : 14, height: big ? 4 : 3, background: tone }} />
      {children}
    </span>
  );
}
