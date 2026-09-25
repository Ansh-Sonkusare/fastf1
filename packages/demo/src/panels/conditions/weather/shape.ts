import type { Weather } from "@f1/core";

/**
 * Weather view model for display in the Weather panel.
 * Shows weather conditions up to and including the specified time.
 */
export interface WeatherViewModel {
  /** ISO timestamp of the weather data point */
  date: string;
  /** Air temperature in °C, or undefined if not available */
  airTemperature?: number;
  /** Track temperature in °C, or undefined if not available */
  trackTemperature?: number;
  /** Humidity as a percentage (0-100), or undefined if not available */
  humidity?: number;
  /** Atmospheric pressure in mbar, or undefined if not available */
  pressure?: number;
  /** Wind speed in m/s, or undefined if not available */
  windSpeed?: number;
  /** Wind direction in degrees (0-360), or undefined if not available */
  windDirection?: number;
  /** Precipitation indicator, or undefined if not available */
  precipitation?: number;
  /** Track surface temperature in °C, or undefined if not available */
  trackSurfaceTemperature?: number;
}

/**
 * Shapes raw OpenF1 Weather data into view models.
 * Returns weather data up to and including the given time.
 * Filters out entries after the specified cutoff time.
 *
 * @param weather Array of raw Weather data from OpenF1
 * @param cutoffTime ISO timestamp to filter weather data (inclusive)
 * @returns Array of WeatherViewModel objects, sorted by date
 */
export function shapeWeather(
  weather: readonly Weather[],
  cutoffTime: string
): WeatherViewModel[] {
  return weather
    .filter((w) => w.date <= cutoffTime)
    .map((w) => ({
      date: w.date,
      airTemperature: w.air_temperature,
      trackTemperature: w.track_temperature,
      humidity: w.humidity,
      pressure: w.pressure,
      windSpeed: w.wind_speed,
      windDirection: w.wind_direction,
      precipitation: w.precipitation,
      trackSurfaceTemperature: w.track_surface_temperature,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Gets the latest weather reading up to the specified time.
 * Returns the most recent weather data point.
 *
 * @param weather Array of raw Weather data from OpenF1
 * @param cutoffTime ISO timestamp to filter weather data (inclusive)
 * @returns Latest WeatherViewModel or undefined if no data available
 */
export function getLatestWeather(
  weather: readonly Weather[],
  cutoffTime: string
): WeatherViewModel | undefined {
  const shaped = shapeWeather(weather, cutoffTime);
  return shaped.length > 0 ? shaped[shaped.length - 1] : undefined;
}
