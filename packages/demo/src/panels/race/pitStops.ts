import { OpenF1Pit } from "@f1/core";

export interface PitStopViewModel {
  rank: number;
  driverNumber: number;
  lapNumber: number;
  stopNumber: number;
  stationaryDuration: number | null | undefined; // seconds, stop_duration
  laneDuration: number | null | undefined; // seconds, lane_duration
  totalDuration: number | null | undefined; // seconds, pit_duration
}

/**
 * Shape pit stop data from OpenF1 into view model.
 * Each pit stop shows stationary time vs lane time.
 * Ranked by lap number (earliest stops first).
 */
export function shapePitStops(
  pits: OpenF1Pit[],
  sessionKey: number
): PitStopViewModel[] {
  return pits
    .filter((p) => p.session_key === sessionKey && p.lap_number !== null)
    .map((p, idx) => ({
      rank: idx + 1,
      driverNumber: p.driver_number,
      lapNumber: p.lap_number!,
      stopNumber: p.stop_number ?? idx + 1,
      stationaryDuration: p.stop_duration,
      laneDuration: p.lane_duration,
      totalDuration: p.pit_duration,
    }))
    .sort((a, b) => a.lapNumber - b.lapNumber);
}

/**
 * Get max pit duration for scaling in chart
 */
export function getMaxPitDuration(stops: PitStopViewModel[]): number {
  const max = Math.max(
    ...stops.map((s) => s.totalDuration ?? 0)
  );
  return max > 0 ? max : 30; // default 30s if no data
}
