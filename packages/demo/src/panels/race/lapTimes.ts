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
 * Returns array of [lapStart, lapEnd] ranges where the whole field was slowed.
 *
 * OpenF1's `race_control` rows carry `category: "Flag"`, `flag: "YELLOW" |
 * "DOUBLE YELLOW" | "GREEN" | "CHEQUERED" | ...`, and `scope: "Track" |
 * "Sector" | "Driver"`. A field-wide SC/VSC period shows up as a `scope:
 * "Track"` yellow (as opposed to a local double-yellow, which is `scope:
 * "Sector"` and doesn't slow cars away from that corner) that later clears
 * with a `scope: "Track"` green. An explicit "SAFETY CAR" mention in the
 * message is treated as a start regardless of scope, since that phrasing is
 * unambiguous. Neither 2025 Abu Dhabi (session 9839) nor Monza (session
 * 9912) had a real SC/VSC period in their race_control feed: both only ever
 * went track-wide yellow at the green-flag exceptions (pit exit open) and
 * track-wide green/chequered (see lapTimes.test.ts).
 */
export function identifySCPeriods(
  raceControl: RaceControl[],
  sessionKey: number
): Array<[number, number]> {
  const periods: Array<[number, number]> = [];
  let scStartLap: number | null = null;

  const events = raceControl
    .filter((rc) => rc.session_key === sessionKey && rc.category === "Flag")
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const event of events) {
    const lap = event.lap_number;
    if (!lap) continue;

    const isTrackWide = event.scope === "Track" || event.scope == null;
    const isSCMessage = event.message.toUpperCase().includes("SAFETY CAR");
    const isYellow = event.flag === "YELLOW" || event.flag === "DOUBLE YELLOW";
    const isClear = event.flag === "GREEN" || event.flag === "CHEQUERED";

    if (scStartLap === null && isSCMessage) {
      scStartLap = lap;
    } else if (scStartLap === null && isTrackWide && isYellow) {
      scStartLap = lap;
    } else if (scStartLap !== null && isTrackWide && isClear) {
      periods.push([scStartLap, lap]);
      scStartLap = null;
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
 * Identify each driver's pit-in laps from stint data: the last lap of every
 * stint but their final one (a driver's last stint runs to the flag, not a
 * pit stop). Keyed per driver, since a real multi-driver field means one
 * driver's pit lap is an ordinary green-flag lap for everyone else.
 */
export function identifyPitLaps(
  stints: Stint[],
  sessionKey: number
): Map<number, Set<number>> {
  const byDriver = new Map<number, Stint[]>();
  stints
    .filter((s) => s.session_key === sessionKey)
    .forEach((s) => {
      if (!byDriver.has(s.driver_number)) byDriver.set(s.driver_number, []);
      byDriver.get(s.driver_number)!.push(s);
    });

  const pitLaps = new Map<number, Set<number>>();
  for (const [driverNumber, driverStints] of byDriver) {
    const sorted = [...driverStints].sort((a, b) => a.stint_number - b.stint_number);
    // The last stint runs to the flag; its lap_end is the finish, not a stop.
    const stopLaps = sorted.slice(0, -1).map((s) => s.lap_end);
    pitLaps.set(driverNumber, new Set(stopLaps));
  }
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
      isPitLap:
        (pitLaps.get(lap.driver_number)?.has(lap.lap_number) ?? false) ||
        (lap.is_pit_out_lap ?? false),
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
