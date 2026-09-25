import { Swatch } from "../../ui/primitives";
import { color, font } from "../../ui/tokens";

const B_RING = "#7d8692";
import type { TrackView } from "./track";

interface TrackMapViewProps {
  readonly view: TrackView;
  readonly drivers: ReadonlyMap<number, { code: string; color: string }>;
}

export function TrackMapView({ view, drivers }: TrackMapViewProps) {
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
          <g key={`car-${car.number}`} style={{ transform: `translate(${car.at[0]}px,${car.at[1]}px)` }}>
            {car.role && <circle cx={0} cy={0} r={10} style={{ fill: "none", stroke: isRoleA ? color.text : B_RING, strokeWidth: 1.5 }} />}
            <circle cx={0} cy={0} r={5.5} style={{ fill: driver?.color ?? B_RING, stroke: color.bg, strokeWidth: 1.5 }} />
            {car.labelled && driver && (
              <text
                x={9}
                y={-8}
                style={{
                  fill: isRoleA ? "#ffffff" : color.textMuted,
                  font: `700 10px ${font.mono}`,
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

export function TrackMapLegend() {
  return (
    <>
      <Swatch tone={color.drs}>DRS</Swatch>
      <Swatch tone={color.yellow}>YELLOW</Swatch>
    </>
  );
}
