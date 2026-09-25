/**
 * Raw OpenF1 weather row shape, as actually returned by
 * GET https://api.openf1.org/v1/weather?session_key=... (verified live
 * 2026-09-25 against session_key 9839 and 9912 — see
 * packages/demo/src/panels/conditions/__fixtures__/fetch.mjs).
 *
 * Note: this deliberately does NOT reuse @f1/core's `Weather` type. That
 * schema (packages/core/src/schemas/openf1.ts) declares `precipitation`
 * and `track_surface_temperature` fields that the live API never sends —
 * the real field is `rainfall`, and there is no surface-temperature
 * field at all. Using the real shape here keeps this panel's fixtures
 * and assertions honest; the mismatch should be fixed in @f1/core
 * separately (flagged to the lane B/root owners).
 */
export interface OpenF1WeatherRow {
  session_key: number;
  meeting_key: number;
  date: string;
  air_temperature?: number | null;
  track_temperature?: number | null;
  humidity?: number | null;
  pressure?: number | null;
  wind_speed?: number | null;
  wind_direction?: number | null;
  rainfall?: number | null;
}

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
  /** Rainfall indicator as returned by OpenF1 (0 = none, 1 = rain), or undefined if not available */
  rainfall?: number;
}

function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Shapes raw OpenF1 Weather data into view models.
 * Returns weather data up to and including the given time.
 * Filters out entries after the specified cutoff time.
 *
 * @param weather Array of raw weather rows from OpenF1 (`GET /v1/weather`)
 * @param cutoffTime ISO timestamp to filter weather data (inclusive)
 * @returns Array of WeatherViewModel objects, sorted by date
 */
export function shapeWeather(
  weather: readonly OpenF1WeatherRow[],
  cutoffTime: string
): WeatherViewModel[] {
  return weather
    .filter((w) => w.date <= cutoffTime)
    .map((w) => ({
      date: w.date,
      airTemperature: nullToUndefined(w.air_temperature),
      trackTemperature: nullToUndefined(w.track_temperature),
      humidity: nullToUndefined(w.humidity),
      pressure: nullToUndefined(w.pressure),
      windSpeed: nullToUndefined(w.wind_speed),
      windDirection: nullToUndefined(w.wind_direction),
      rainfall: nullToUndefined(w.rainfall),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Gets the latest weather reading up to the specified time.
 * Returns the most recent weather data point.
 *
 * @param weather Array of raw weather rows from OpenF1
 * @param cutoffTime ISO timestamp to filter weather data (inclusive)
 * @returns Latest WeatherViewModel or undefined if no data available
 */
export function getLatestWeather(
  weather: readonly OpenF1WeatherRow[],
  cutoffTime: string
): WeatherViewModel | undefined {
  const shaped = shapeWeather(weather, cutoffTime);
  return shaped.length > 0 ? shaped[shaped.length - 1] : undefined;
}
