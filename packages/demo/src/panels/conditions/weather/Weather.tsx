import React from "react";
import type { WeatherViewModel } from "./shape";

export interface WeatherProps {
  /**
   * Array of weather data points to display, ordered by date.
   * The component shows the most recent entries as mini-cards
   * with sparkline trends.
   */
  weather: WeatherViewModel[];
}

/**
 * Weather panel component.
 * Displays current weather conditions (temperature, humidity, wind, rainfall)
 * with sparkline visualizations showing trends over time.
 *
 * Matches reference panel-08.png layout:
 * - Label + 4 key metrics (Air, Track, Wind, Precipitation)
 * - Each shows current value and sparkline chart
 * - Uses IBM Plex Mono and Monza color scheme
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

  return (
    <div style={{ display: "flex", gap: "22px", padding: "8px", alignItems: "center" }}>
      {latest.airTemperature !== undefined && (
        <WeatherMetric
          label="Air"
          value={latest.airTemperature}
          unit="°C"
          data={weather.map((w) => w.airTemperature ?? 0).filter((v) => v > 0)}
          color="#e4e7eb"
        />
      )}
      {latest.trackTemperature !== undefined && (
        <WeatherMetric
          label="Track"
          value={latest.trackTemperature}
          unit="°C"
          data={weather.map((w) => w.trackTemperature ?? 0).filter((v) => v > 0)}
          color="#f5d020"
        />
      )}
      {latest.windSpeed !== undefined && (
        <WeatherMetric
          label="Wind"
          value={latest.windSpeed}
          unit="m/s"
          data={weather.map((w) => w.windSpeed ?? 0)}
          subtext={getWindDirection(latest.windDirection)}
          color="#e4e7eb"
        />
      )}
      {latest.rainfall !== undefined && (
        <WeatherMetric
          label="Rain"
          value={latest.rainfall}
          // OpenF1's `rainfall` is a 0/1 flag, not a percentage or mm figure.
          unit=""
          data={weather.map((w) => w.rainfall ?? 0)}
          color="#6fd3e8"
        />
      )}
    </div>
  );
};

interface WeatherMetricProps {
  label: string;
  value: number;
  unit: string;
  data: number[];
  color?: string;
  subtext?: string;
}

/**
 * Individual weather metric display with sparkline.
 * Shows a label, current value, and trend chart.
 */
const WeatherMetric: React.FC<WeatherMetricProps> = ({
  label,
  value,
  unit,
  data,
  color = "#e4e7eb",
  subtext,
}) => {
  // Generate a simple SVG sparkline from the data
  const sparklinePath = generateSparkline(data);

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
            color: "#e4e7eb",
          }}
        >
          {value.toFixed(1)}
          {unit}
        </span>
        {subtext && (
          <span
            style={{
              font: '400 9px/1 "IBM Plex Mono", monospace',
              color: "#8b939e",
            }}
          >
            {subtext}
          </span>
        )}
      </div>
      {/* Sparkline chart */}
      <svg
        viewBox="0 0 100 24"
        preserveAspectRatio="none"
        style={{
          width: "84px",
          height: "26px",
          display: "block",
          flexShrink: 0,
        }}
      >
        <path
          d={sparklinePath}
          style={{
            fill: "none",
            stroke: color,
            strokeWidth: 1.5,
            vectorEffect: "non-scaling-stroke",
          }}
        />
      </svg>
    </div>
  );
};

/**
 * Converts numeric data array into an SVG path for a sparkline.
 * Normalizes data to fit in a 100x24 viewBox.
 */
function generateSparkline(data: number[]): string {
  if (data.length < 2) return "M0,12 L100,12"; // Flat line if not enough data

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 24 - ((value - min) / range) * 24;
    return `${x},${y}`;
  });

  return `M${points.join(" L")}`;
}

/**
 * Convert wind direction degrees to compass direction abbreviation.
 */
function getWindDirection(degrees?: number): string {
  if (degrees === undefined || degrees === null) return "";

  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                      "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

export default Weather;
