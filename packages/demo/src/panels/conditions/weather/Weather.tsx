import React from "react";
import type { WeatherViewModel } from "./shape";

export interface WeatherProps {
  /**
   * Array of weather data points to display.
   * The component shows the most recent entries as mini-cards
   * with sparkline trends.
   */
  weather: WeatherViewModel[];
}

/**
 * Weather panel component.
 * Displays current weather conditions (temperature, humidity, wind, etc.)
 * with optional sparkline visualizations for trends.
 *
 * This is a phase 1 presentational component.
 * In phase 2, it will be wired to receive shaped data from the OpenF1 gate.
 */
export const Weather: React.FC<WeatherProps> = ({ weather }) => {
  if (!weather || weather.length === 0) {
    return (
      <div style={{ padding: "12px", color: "#8b939e", fontSize: "12px" }}>
        No weather data available
      </div>
    );
  }

  // Get the latest weather reading
  const latest = weather[weather.length - 1];

  // Calculate trend: check if value changed from previous reading
  const prev = weather.length > 1 ? weather[weather.length - 2] : null;

  return (
    <div style={{ display: "flex", gap: "22px", padding: "8px" }}>
      {latest.airTemperature !== undefined && (
        <WeatherMetric
          label="Air Temp"
          value={latest.airTemperature}
          unit="°C"
          previousValue={prev?.airTemperature}
        />
      )}
      {latest.trackTemperature !== undefined && (
        <WeatherMetric
          label="Track Temp"
          value={latest.trackTemperature}
          unit="°C"
          previousValue={prev?.trackTemperature}
        />
      )}
      {latest.humidity !== undefined && (
        <WeatherMetric
          label="Humidity"
          value={latest.humidity}
          unit="%"
          previousValue={prev?.humidity}
        />
      )}
      {latest.windSpeed !== undefined && (
        <WeatherMetric
          label="Wind"
          value={latest.windSpeed}
          unit="m/s"
          previousValue={prev?.windSpeed}
        />
      )}
      {latest.precipitation !== undefined && (
        <WeatherMetric
          label="Precip"
          value={latest.precipitation}
          unit=""
          previousValue={prev?.precipitation}
        />
      )}
    </div>
  );
};

interface WeatherMetricProps {
  label: string;
  value: number;
  unit: string;
  previousValue?: number;
}

/**
 * Individual weather metric display.
 * Shows a label, value, and optional trend indicator.
 */
const WeatherMetric: React.FC<WeatherMetricProps> = ({
  label,
  value,
  unit,
  previousValue,
}) => {
  // Determine if value is increasing or decreasing
  let trend: "up" | "down" | "stable" = "stable";
  if (previousValue !== undefined && previousValue !== null) {
    if (value > previousValue) trend = "up";
    else if (value < previousValue) trend = "down";
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <span
          style={{
            font: '500 10px/1 "IBM Plex Mono", monospace',
            letterSpacing: ".08em",
            color: "#8b939e",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        <span
          style={{
            font: '500 14px/1 "IBM Plex Mono", monospace',
          }}
        >
          {value.toFixed(1)}
          {unit}
        </span>
      </div>
      {/* Placeholder for sparkline - phase 2 enhancement */}
      <div
        style={{
          width: "84px",
          height: "26px",
          background: "rgba(139, 147, 158, 0.1)",
          borderRadius: "2px",
          flexShrink: 0,
        }}
        title={`Trend: ${trend}`}
      />
    </div>
  );
};

export default Weather;
