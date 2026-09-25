import React from "react";
import {
  TyreStintViewModel,
  getCompoundColor,
  getCompoundAbbr,
} from "./tyreStrategy";
import { OpenF1Driver } from "@f1/core";

interface TyreStrategyGanttProps {
  stints: TyreStintViewModel[];
  drivers: Map<number, OpenF1Driver>;
  maxLap: number;
  currentLap: number;
}

export const TyreStrategyGantt: React.FC<TyreStrategyGanttProps> = ({
  stints,
  drivers,
  maxLap,
  currentLap,
}) => {
  // Group stints by driver
  const driverStints = new Map<number, TyreStintViewModel[]>();
  stints.forEach((stint) => {
    if (!driverStints.has(stint.driverNumber)) {
      driverStints.set(stint.driverNumber, []);
    }
    driverStints.get(stint.driverNumber)!.push(stint);
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        padding: "8px 12px 10px",
      }}
    >
      {/* Tick marks header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "40px minmax(0,1fr)",
          gap: "6px",
          marginBottom: "8px",
        }}
      >
        <span></span>
        <div style={{ position: "relative", height: "10px" }}>
          {Array.from({ length: Math.ceil(maxLap / 10) }).map((_, i) => {
            const lap = (i + 1) * 10;
            const left = (lap / maxLap) * 100;
            return (
              <span
                key={lap}
                style={{
                  position: "absolute",
                  left: `${left}%`,
                  transform: "translateX(-50%)",
                  font: "400 10px/1 'IBM Plex Mono', monospace",
                  color: "#5b636e",
                  fontSize: "9px",
                }}
              >
                L{lap}
              </span>
            );
          })}
        </div>
      </div>

      {/* Driver rows */}
      {Array.from(driverStints.entries()).map(([driverNumber, driverStintsArray]) => {
        const driver = drivers.get(driverNumber);

        return (
          <div
            key={driverNumber}
            style={{
              display: "grid",
              gridTemplateColumns: "40px minmax(0,1fr)",
              gap: "6px",
              alignItems: "center",
              height: "21px",
              background:
                driverNumber % 2 === 0
                  ? "rgba(255,255,255,0.02)"
                  : "transparent",
            }}
          >
            {/* Driver label */}
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontWeight: 700,
                fontSize: "12.5px",
              }}
            >
              <span
                style={{
                  width: "3px",
                  height: "12px",
                  background: driver?.team_colour ?? "#8b939e",
                }}
              />
              {driver?.name_acronym ?? `#${driverNumber}`}
            </span>

            {/* Stints timeline */}
            <div
              style={{
                position: "relative",
                height: "100%",
                background: "rgba(0,0,0,0.3)",
                borderRadius: "2px",
              }}
            >
              {/* Stint blocks */}
              {driverStintsArray.map((stint, idx) => {
                const left =
                  ((stint.lapStart - 1) / maxLap) * 100;
                const width = (stint.duration / maxLap) * 100;
                const color = getCompoundColor(stint.compound);
                const abbr = getCompoundAbbr(stint.compound);

                return (
                  <div
                    key={idx}
                    style={{
                      position: "absolute",
                      top: "3px",
                      bottom: "3px",
                      left: `${left}%`,
                      width: `${width}%`,
                      background: color,
                      border: `1px solid ${color}`,
                      borderRadius: "2px",
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: "4px",
                      overflow: "hidden",
                      font: "700 9px/1 'IBM Plex Mono', monospace",
                      color: "#0b0d10",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {abbr} {stint.tyreAgeAtStart ?? 0}
                  </div>
                );
              })}

              {/* Current lap indicator */}
              <span
                style={{
                  position: "absolute",
                  top: "-2px",
                  bottom: "-2px",
                  left: `${(currentLap / maxLap) * 100}%`,
                  width: "1px",
                  background: "#e4e7eb",
                  opacity: 0.7,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
