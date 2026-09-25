import { OpenF1Lap, Stint, RaceControl } from "@f1/core";

export interface LapTimeViewModel {
  lapNumber: number;
  driverNumber: number;
  duration: number | null | undefined; // seconds
  s1: number | null | undefined;
  s2: number | null | undefined;
  s3: number | null | undefined;
  isPitLap: boolean;
  isSlowed: boolean; // true for SC/VSC periods
  i1Speed: number | null | undefined;
  i2Speed: number | null | undefined;
  stSpeed: number | null | undefined;
}

/**
 * Identify Safety Car and VSC periods from race control data.
 * Returns array of [lapStart, lapEnd] ranges where SC/VSC was active.
 */
export function identifySCPeriods(
  raceControl: RaceControl[],
  sessionKey: number
): Array<[number, number]> {
  const periods: Array<[number, number]> = [];
  let scActive = false;
  let scStartLap: number | null = null;

  const scEvents = raceControl
    .filter(
      (rc) =>
        rc.session_key === sessionKey &&
        (rc.category === "SAFETY CAR" ||
          rc.category === "VIRTUAL SAFETY CAR" ||
          rc.flag === "YELLOW")
    )
    .sort((a, b) => {
      const lapA = a.lap_number ?? 0;
      const lapB = b.lap_number ?? 0;
      return lapA - lapB;
    });

  for (const event of scEvents) {
    const lap = event.lap_number;
    if (!lap) continue;

    if (event.message.includes("DEPLOYED") || event.message.includes("START")) {
      if (!scActive) {
        scActive = true;
        scStartLap = lap;
      }
    } else if (event.message.includes("ENDED") || event.message.includes("END")) {
      if (scActive && scStartLap !== null) {
        periods.push([scStartLap, lap]);
        scActive = false;
        scStartLap = null;
      }
    }
  }

  return periods;
}

/**
 * Check if a lap is in a SC/VSC period
 */
function isInSCPeriod(lapNumber: number, scPeriods: Array<[number, number]>): boolean {
  return scPeriods.some(([start, end]) => lapNumber >= start && lapNumber <= end);
}

/**
 * Identify pit laps from stint data.
 * A pit lap is the last lap of a stint (where the driver pits out).
 */
export function identifyPitLaps(stints: Stint[], sessionKey: number): Set<number> {
  const pitLaps = new Set<number>();
  stints
    .filter((s) => s.session_key === sessionKey)
    .forEach((s) => {
      // The lap where tires are changed is lap_end + 1 typically,
      // but we mark lap_end as the pit lap for visibility
      pitLaps.add(s.lap_end);
    });
  return pitLaps;
}

/**
 * Shape lap time data from OpenF1 into view model.
 * Clips SC/VSC laps and pit laps per reference design.
 */
export function shapeLapTimes(
  laps: OpenF1Lap[],
  sessionKey: number,
  stints: Stint[] = [],
  raceControl: RaceControl[] = []
): LapTimeViewModel[] {
  const scPeriods = identifySCPeriods(raceControl, sessionKey);
  const pitLaps = identifyPitLaps(stints, sessionKey);

  return laps
    .filter((lap) => lap.session_key === sessionKey)
    .map((lap) => ({
      lapNumber: lap.lap_number,
      driverNumber: lap.driver_number,
      duration: lap.lap_duration,
      s1: lap.duration_sector_1,
      s2: lap.duration_sector_2,
      s3: lap.duration_sector_3,
      isPitLap: pitLaps.has(lap.lap_number) || (lap.is_pit_out_lap ?? false),
      isSlowed: isInSCPeriod(lap.lap_number, scPeriods),
      i1Speed: lap.i1_speed,
      i2Speed: lap.i2_speed,
      stSpeed: lap.st_speed,
    }))
    .sort((a, b) => {
      if (a.driverNumber !== b.driverNumber)
        return a.driverNumber - b.driverNumber;
      return a.lapNumber - b.lapNumber;
    });
}

/**
 * Filter lap times to exclude SC and pit laps for chart display.
 * Used by presentation layer to "clip" data as per reference design.
 */
export function filterChartLaps(laps: LapTimeViewModel[]): LapTimeViewModel[] {
  return laps.filter((lap) => !lap.isSlowed && !lap.isPitLap);
}

/**
 * Get lap time statistics for a driver
 */
export function getDriverLapStats(
  laps: LapTimeViewModel[],
  driverNumber: number
): {
  bestLap: number | null;
  avgLap: number | null;
  lastLap: number | null;
} {
  const driverLaps = laps.filter(
    (l) => l.driverNumber === driverNumber && l.duration && !l.isSlowed
  );

  if (driverLaps.length === 0) {
    return { bestLap: null, avgLap: null, lastLap: null };
  }

  const durations = driverLaps.map((l) => l.duration as number);
  return {
    bestLap: Math.min(...durations),
    avgLap:
      durations.reduce((a, b) => a + b, 0) / durations.length,
    lastLap: driverLaps[driverLaps.length - 1].duration as number | null,
  };
}
