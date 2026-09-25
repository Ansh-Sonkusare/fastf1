import type { PitStop } from "../../app/timeline";

export interface PitStopViewModel {
  rank: number;
  driverNumber: number;
  lapNumber: number;
  stopNumber: number;
  stationaryDuration: number | null; // seconds; null when OpenF1 didn't time it. Render as unknown, never 0.
  laneDuration: number | null; // seconds in the pit lane
}

/**
 * Shape B's `realPitStops` (the one definition of a real pit stop, in
 * `app/timeline.ts`) into a view model for the ranked list.
 * Ranked fastest stationary time first, per the reference design (panel 07);
 * a stop with no recorded stationary time sorts last but is still shown.
 */
export function shapePitStops(stops: readonly PitStop[]): PitStopViewModel[] {
  const byLap = [...stops].sort((a, b) => a.lap - b.lap);

  // Real OpenF1 rows never carry `stop_number` (see DATA.md); derive each
  // driver's stop count in chronological order instead of trusting the field.
  const stopCountByDriver = new Map<number, number>();

  return byLap
    .map((s) => {
      const stopNumber = (stopCountByDriver.get(s.driver) ?? 0) + 1;
      stopCountByDriver.set(s.driver, stopNumber);
      return {
        rank: 0, // assigned below, after sorting by stationary time
        driverNumber: s.driver,
        lapNumber: s.lap,
        stopNumber,
        stationaryDuration: s.stationary,
        laneDuration: s.lane,
      };
    })
    .sort((a, b) => {
      if (a.stationaryDuration == null) return 1;
      if (b.stationaryDuration == null) return -1;
      return a.stationaryDuration - b.stationaryDuration;
    })
    .map((stop, idx) => ({ ...stop, rank: idx + 1 }));
}

/** Get max lane duration for scaling in chart. */
export function getMaxPitDuration(stops: PitStopViewModel[]): number {
  const max = Math.max(...stops.map((s) => s.laneDuration ?? 0));
  return max > 0 ? max : 30; // default 30s if no data
}
