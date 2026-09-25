import { OpenF1Pit } from "@f1/core";

export interface PitStopViewModel {
  rank: number;
  driverNumber: number;
  lapNumber: number;
  stopNumber: number;
  stationaryDuration: number; // seconds, stop_duration (never null: see shapePitStops)
  laneDuration: number | null | undefined; // seconds, lane_duration
  totalDuration: number | null | undefined; // seconds, pit_duration
}

/**
 * Shape pit stop data from OpenF1 into view model.
 * Each pit stop shows stationary time vs lane time.
 * Ranked fastest stationary time first, per the reference design (panel 07).
 *
 * Excludes rows with no `stop_duration`: CONTRACT.md notes the `pit` feed
 * also logs every car's mandatory drive-through during an SC-through-the-
 * pit-lane period (null `stop_duration`, ~13s lane time, no real stop), and
 * says to exclude exactly those rows the same way the tower's stop count
 * does. "Every completed pit stop" (the reference spec) means a real,
 * timed one.
 */
export function shapePitStops(
  pits: OpenF1Pit[],
  sessionKey: number
): PitStopViewModel[] {
  const bySessionAndLap = pits
    .filter(
      (p): p is OpenF1Pit & { lap_number: number; stop_duration: number } =>
        p.session_key === sessionKey && p.lap_number != null && p.stop_duration != null
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
    .sort((a, b) => a.stationaryDuration - b.stationaryDuration)
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
