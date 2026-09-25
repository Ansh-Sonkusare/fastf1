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
 * Ranked fastest stationary time first, per the reference design (panel 07);
 * a stop with no recorded stationary time sorts last but is still shown.
 *
 * A null `stop_duration` is NOT proof of a non-stop: real 2025 stops
 * sometimes have it null too (Vegas HUL L30, Zandvoort ANT L53, Abu Dhabi
 * HUL L7 — see pitStops.test.ts). Only a genuine SC-pit-lane drive-through
 * should be excluded, and that takes a compound-change check against
 * `stints` that this function doesn't have the data for. TODO: once B
 * publishes `realPitStops(pits, stints, passLaps)` in `app/`, filter through
 * it here instead of passing every row.
 */
export function shapePitStops(
  pits: OpenF1Pit[],
  sessionKey: number
): PitStopViewModel[] {
  const bySessionAndLap = pits
    .filter(
      (p): p is OpenF1Pit & { lap_number: number } =>
        p.session_key === sessionKey && p.lap_number != null
    )
    .sort((a, b) => a.lap_number - b.lap_number);

  // Real OpenF1 rows never carry `stop_number` (see DATA.md); derive each
  // driver's stop count in chronological order instead of trusting the field.
  const stopCountByDriver = new Map<number, number>();

  return bySessionAndLap
    .map((p) => {
      const stopNumber = (stopCountByDriver.get(p.driver_number) ?? 0) + 1;
      stopCountByDriver.set(p.driver_number, stopNumber);
      return {
        rank: 0, // assigned below, after sorting by stationary time
        driverNumber: p.driver_number,
        lapNumber: p.lap_number,
        stopNumber: p.stop_number ?? stopNumber,
        stationaryDuration: p.stop_duration,
        laneDuration: p.lane_duration,
        totalDuration: p.pit_duration,
      };
    })
    .sort((a, b) => {
      if (a.stationaryDuration == null) return 1;
      if (b.stationaryDuration == null) return -1;
      return a.stationaryDuration - b.stationaryDuration;
    })
    .map((stop, idx) => ({ ...stop, rank: idx + 1 }));
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
