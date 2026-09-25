import React from "react";
import { PitStopViewModel, getMaxPitDuration } from "./pitStops";
import { OpenF1Driver } from "@f1/core";

interface PitStopsGridProps {
  stops: PitStopViewModel[];
  drivers: Map<number, OpenF1Driver>;
}

export const PitStopsGrid: React.FC<PitStopsGridProps> = ({
  stops,
  drivers,
}) => {
  const maxDuration = getMaxPitDuration(stops);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "20px 44px minmax(0,1fr) 44px 44px",
          gap: "8px",
          padding: "9px 12px",
          font: "500 10px/1 'IBM Plex Mono', monospace",
          color: "#5b636e",
          borderBottom: "1px solid #1f242b",
        }}
      >
        <span></span>
        <span>DRV</span>
        <span></span>
        <span style={{ textAlign: "right" }}>STAT</span>
        <span style={{ textAlign: "right" }}>LANE</span>
      </div>

      {/* Pit stop rows */}
      {stops.map((stop) => {
        const driver = drivers.get(stop.driverNumber);
        const barWidth =
          stop.totalDuration && maxDuration
            ? (stop.totalDuration / maxDuration) * 100
            : 0;

        return (
          <div
            key={`${stop.driverNumber}-${stop.stopNumber}`}
            style={{
              display: "grid",
              gridTemplateColumns: "20px 44px minmax(0,1fr) 44px 44px",
              gap: "8px",
              alignItems: "center",
              height: "30px",
              borderBottom: "1px solid #181c21",
              font: "500 12px/1 'IBM Plex Mono', monospace",
              padding: "0 12px",
            }}
          >
            {/* Rank */}
            <span style={{ color: "#5b636e" }}>{stop.rank}</span>

            {/* Driver code */}
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontFamily: "'IBM Plex Sans Condensed'",
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              <span
                style={{
                  width: "3px",
                  height: "12px",
                  background: driver?.team_colour ?? "#8b939e",
                }}
              />
              {driver?.name_acronym ?? `#${stop.driverNumber}`}
            </span>

            {/* Bar chart */}
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                minWidth: 0,
              }}
            >
              <span
                style={{
                  height: "6px",
                  width: `${barWidth}%`,
                  background: "#6fd3e8",
                  borderRadius: "1px",
                }}
              />
              <span style={{ color: "#5b636e", fontSize: "10px" }}>
                L{stop.lapNumber}
              </span>
            </span>

            {/* Stationary duration */}
            <span
              style={{
                textAlign: "right",
                color: "#e4e7eb",
              }}
            >
              {stop.stationaryDuration?.toFixed(2) ?? "—"}s
            </span>

            {/* Lane duration */}
            <span
              style={{
                textAlign: "right",
                color: "#8b939e",
              }}
            >
              {stop.laneDuration?.toFixed(2) ?? "—"}s
            </span>
          </div>
        );
      })}
    </div>
  );
};
