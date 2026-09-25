import React from "react";
import { LapTimeViewModel, filterChartLaps } from "./lapTimes";
import { OpenF1Driver } from "@f1/core";

interface LapTimesChartProps {
  laps: LapTimeViewModel[];
  drivers: Map<number, OpenF1Driver>;
  focusDriver?: number; // primary driver
  compareDriver?: number; // secondary driver
  width?: number;
  height?: number;
}

export const LapTimesChart: React.FC<LapTimesChartProps> = ({
  laps,
  drivers,
  focusDriver,
  compareDriver,
  width = 900,
  height = 350,
}) => {
  const chartLaps = filterChartLaps(laps);

  if (chartLaps.length === 0) {
    return (
      <div style={{ padding: "20px", color: "#5b636e" }}>
        No lap data available (SC/pit laps filtered)
      </div>
    );
  }

  // Get min/max lap times for scaling
  const durations = chartLaps
    .filter((l) => l.duration)
    .map((l) => l.duration as number);

  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  const durationRange = maxDuration - minDuration;

  const padding = { top: 16, right: 32, bottom: 32, left: 44 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Map lap to x coordinate
  const lapToX = (lapNum: number): number => {
    const maxLap = Math.max(...chartLaps.map((l) => l.lapNumber));
    return padding.left + (lapNum / maxLap) * plotWidth;
  };

  // Map duration to y coordinate
  const durationToY = (duration: number): number => {
    const normalized = (duration - minDuration) / (durationRange || 1);
    return padding.top + plotHeight - normalized * plotHeight;
  };

  // Build path for driver
  const buildPath = (driverNum: number): string => {
    const driverLaps = chartLaps
      .filter((l) => l.driverNumber === driverNum && l.duration)
      .sort((a, b) => a.lapNumber - b.lapNumber);

    if (driverLaps.length === 0) return "";

    const points = driverLaps
      .map((lap) => `${lapToX(lap.lapNumber)},${durationToY(lap.duration as number)}`)
      .join(" L ");

    return `M ${points}`;
  };

  const focusPath = focusDriver ? buildPath(focusDriver) : "";
  const comparePath = compareDriver ? buildPath(compareDriver) : "";

  const focusDriver_obj = focusDriver ? drivers.get(focusDriver) : undefined;
  const compareDriver_obj = compareDriver
    ? drivers.get(compareDriver)
    : undefined;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", display: "block" }}
    >
      {/* Grid lines */}
      {Array.from({ length: 5 }).map((_, i) => {
        const y = padding.top + (plotHeight / 4) * i;
        return (
          <g key={`grid-${i}`}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              style={{ stroke: "#1f242b", strokeWidth: 1 }}
            />
            <text
              x={padding.left - 6}
              y={y + 4}
              style={{
                fill: "#5b636e",
                font: "400 10px 'IBM Plex Mono', monospace",
                textAnchor: "end",
              }}
            >
              {(minDuration + (durationRange / 4) * (4 - i)).toFixed(1)}s
            </text>
          </g>
        );
      })}

      {/* Focus driver line */}
      {focusPath && (
        <path
          d={focusPath}
          style={{
            fill: "none",
            stroke: focusDriver_obj?.team_colour ?? "#6fd3e8",
            strokeWidth: 2,
          }}
        />
      )}

      {/* Compare driver line (dashed) */}
      {comparePath && (
        <path
          d={comparePath}
          style={{
            fill: "none",
            stroke: compareDriver_obj?.team_colour ?? "#6fd3e8",
            strokeWidth: 1.5,
            strokeDasharray: "4 3",
            opacity: 0.85,
          }}
        />
      )}

      {/* X axis labels */}
      {Array.from({ length: 6 }).map((_, i) => {
        const maxLap = Math.max(...chartLaps.map((l) => l.lapNumber));
        const lap = Math.round((maxLap / 5) * i);
        const x = lapToX(lap);

        return (
          <text
            key={`x-${i}`}
            x={x}
            y={height - padding.bottom + 16}
            style={{
              fill: "#5b636e",
              font: "400 10px 'IBM Plex Mono', monospace",
              textAnchor: "middle",
            }}
          >
            L{lap}
          </text>
        );
      })}

      {/* "LAP" label */}
      <text
        x={width - 10}
        y={height - 4}
        style={{
          fill: "#5b636e",
          font: "400 9px 'IBM Plex Mono', monospace",
          textAnchor: "end",
        }}
      >
        LAP
      </text>
    </svg>
  );
};
