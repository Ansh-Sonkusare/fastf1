import type { OpenF1Lap, OpenF1Stint } from "../schemas/openf1";

export function filterByDriver(laps: OpenF1Lap[], driverNum: number): OpenF1Lap[] {
  return laps.filter((l) => l.driver_number === driverNum);
}

export function filterRaceLaps(laps: OpenF1Lap[]): OpenF1Lap[] {
  return laps.filter(
    (l) => l.lap_duration != null && l.pit_out_lap === false && l.pit_in_lap === false,
  );
}

export function getFastestLap(laps: OpenF1Lap[]): OpenF1Lap | null {
  return laps.reduce(
    (best, lap) =>
      lap.lap_duration != null && (best == null || lap.lap_duration < best.lap_duration)
        ? lap
        : best,
    null as OpenF1Lap | null,
  );
}

export interface SectorBest {
  sector: number;
  time: number;
  driver: number;
}

export function getSectorBest(sector: number, laps: OpenF1Lap[]): SectorBest | null {
  const filtered = laps.filter((l) => {
    if (sector === 1) return l.duration_sector_1 != null;
    if (sector === 2) return l.duration_sector_2 != null;
    if (sector === 3) return l.duration_sector_3 != null;
    return false;
  });

  return filtered.reduce(
    (best, lap) => {
      const time =
        sector === 1
          ? l.duration_sector_1
          : sector === 2
            ? l.duration_sector_2
            : l.duration_sector_3;
      return time != null && (best == null || time < best.time)
        ? { sector, time, driver: l.driver_number }
        : best;
    },
    null as SectorBest | null,
  );
}

export interface DegradationResult {
  driver: number;
  avgDegradation: number;
  laps: number;
}

export function getTyreDegradation(
  stints: OpenF1Stint[],
  laps: OpenF1Lap[],
  fuelCorrection = true,
  trackEvolution = true,
): DegradationResult[] {
  if (stints.length === 0) return [];

  const results: DegradationResult[] = [];
  for (const stint of stints) {
    const stintLaps = laps.filter(
      (l) =>
        l.driver_number === stint.driver_number &&
        l.lap_number >= stint.lap_start &&
        l.lap_number <= stint.lap_end &&
        l.lap_duration != null,
    );

    if (stintLaps.length < 2) continue;

    let degradation = 0;
    for (let i = 1; i < stintLaps.length; i++) {
      const prev = stintLaps[i - 1].lap_duration ?? 0;
      const curr = stintLaps[i].lap_duration ?? 0;
      const delta = curr - prev;
      if (fuelCorrection && i < stintLaps.length - 1) {
        degradation += delta * (1 - i / stintLaps.length);
      } else {
        degradation += delta;
      }
    }
    if (trackEvolution && stintLaps.length > 2) {
      const firstHalf = stintLaps
        .slice(0, Math.floor(stintLaps.length / 2))
        .reduce((s, l) => s + (l.lap_duration ?? 0), 0 / Math.floor(stintLaps.length / 2));
      const secondHalf = stintLaps
        .slice(Math.floor(stintLaps.length / 2))
        .reduce(
          (s, l) => s + (l.lap_duration ?? 0),
          0 / (stintLaps.length - Math.floor(stintLaps.length / 2)),
        );
      degradation -= secondHalf - firstHalf;
    }

    results.push({
      driver: stint.driver_number,
      avgDegradation: degradation / stintLaps.length,
      laps: stintLaps.length,
    });
  }

  return results;
}

export interface StintPaceResult {
  driver: number;
  stint: number;
  pace: number;
  laps: number;
}

export function getStintPace(stints: OpenF1Stint[], laps: OpenF1Lap[]): StintPaceResult[] {
  if (stints.length === 0) return [];

  return stints.map((stint) => {
    const stintLaps = laps.filter(
      (l) =>
        l.driver_number === stint.driver_number &&
        l.lap_number >= stint.lap_start &&
        l.lap_number <= stint.lap_end &&
        l.lap_duration != null,
    );

    const total = stintLaps.reduce((s, l) => s + (l.lap_duration ?? 0), 0);
    return {
      driver: stint.driver_number,
      stint: stint.stint_number,
      pace: stintLaps.length > 0 ? total / stintLaps.length : 0,
      laps: stintLaps.length,
    };
  });
}

export interface ConsistencyResult {
  driver: number;
  cv: number;
  laps: number;
}

export function getDriverConsistency(laps: OpenF1Lap[]): ConsistencyResult[] {
  const byDriver = new Map<number, OpenF1Lap[]>();
  for (const lap of laps) {
    if (lap.lap_duration == null) continue;
    const arr = byDriver.get(lap.driver_number) ?? [];
    arr.push(lap);
    byDriver.set(lap.driver_number, arr);
  }

  return Array.from(byDriver.entries()).map(([driver, driverLaps]) => {
    const times = driverLaps.map((l) => l.lap_duration ?? 0);
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((s, t) => s + (t - mean) ** 2, 0) / times.length;
    return { driver, cv: Math.sqrt(variance) / mean, laps: times.length };
  });
}

export interface Delta {
  lap: number;
  time: number;
  driverNumber: number;
}

export function getRaceDeltas(referenceDriver: number, laps: OpenF1Lap[]): Delta[] {
  const refLaps = filterRaceLaps(laps).filter((l) => l.driver_number === referenceDriver);
  const refBest = getFastestLap(refLaps);
  if (!refBest) return [];

  return filterRaceLaps(laps)
    .filter((l) => l.driver_number !== referenceDriver)
    .map((l) => ({
      lap: l.lap_number,
      time: (l.lap_duration ?? 0) - (refBest.lap_duration ?? 0),
      driverNumber: l.driver_number,
    }));
}

export interface PitStop {
  driver: number;
  stop: number;
  lap: number;
  duration: number;
}

export function getPitStopAnalysis(laps: OpenF1Lap[]): PitStop[] {
  const byDriver = new Map<number, { stop: number; lap: number; inTime: number | null }>();
  const pitStops: PitStop[] = [];

  const sorted = [...laps].sort((a, b) => a.lap_number - b.lap_number);

  for (const lap of sorted) {
    const existing = byDriver.get(lap.driver_number);
    if (lap.pit_in_lap === true) {
      if (existing) {
        pitStops.push({
          driver: lap.driver_number,
          stop: existing.stop,
          lap: existing.lap,
          duration: lap.lap_duration ?? 0,
        });
        byDriver.set(lap.driver_number, { ...existing, inTime: null });
      }
    } else if (lap.pit_out_lap === true) {
      const current = existing ?? { stop: 0, lap: 0, inTime: null };
      byDriver.set(lap.driver_number, {
        ...current,
        stop: current.stop + 1,
        lap: lap.lap_number,
        inTime: lap.date_start.getTime(),
      });
    }
  }

  return pitStops;
}

export interface PositionChange {
  lap: number;
  fromPosition: number;
  toPosition: number;
  driverNumber: number;
}

export interface StintData {
  driver_number: number;
  lap_start: number;
  lap_end: number;
  stint_number: number;
}

export function getPositionChanges(
  positions: { driver_number: number; position: number; date: Date }[],
): PositionChange[] {
  const byDriver = new Map<number, typeof positions>();
  for (const pos of positions) {
    const arr = byDriver.get(pos.driver_number) ?? [];
    arr.push(pos);
    byDriver.set(pos.driver_number, arr);
  }

  const changes: PositionChange[] = [];
  for (const [, posHistory] of byDriver) {
    const sorted = posHistory.sort((a, b) => a.date.getTime() - b.date.getTime());
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].position !== sorted[i - 1].position) {
        changes.push({
          lap: 0,
          fromPosition: sorted[i - 1].position,
          toPosition: sorted[i].position,
          driverNumber: sorted[i].driver_number,
        });
      }
    }
  }

  return changes;
}

export interface DriverComparison {
  driverA: number;
  driverB: number;
  lapTimeDiff: number;
  fastestLapDiff: number;
  sectorsDiff: { sector1: number; sector2: number; sector3: number };
}

export function compareDrivers(
  laps: OpenF1Lap[],
  driverA: number,
  driverB: number,
): DriverComparison | null {
  const lapsA = filterRaceLaps(laps).filter((l) => l.driver_number === driverA);
  const lapsB = filterRaceLaps(laps).filter((l) => l.driver_number === driverB);

  if (lapsA.length === 0 || lapsB.length === 0) return null;

  const avgA = lapsA.reduce((s, l) => s + (l.lap_duration ?? 0), 0) / lapsA.length;
  const avgB = lapsB.reduce((s, l) => s + (l.lap_duration ?? 0), 0) / lapsB.length;

  const fastestA = lapsA.reduce(
    (b, l) => (l.lap_duration != null && (b == null || l.lap_duration < b) ? l.lap_duration : b),
    null as number | null,
  );
  const fastestB = lapsB.reduce(
    (b, l) => (l.lap_duration != null && (b == null || l.lap_duration < b) ? l.lap_duration : b),
    null as number | null,
  );

  const s1A = lapsA.filter((l) => l.duration_sector_1 != null);
  const s1B = lapsB.filter((l) => l.duration_sector_1 != null);
  const s2A = lapsA.filter((l) => l.duration_sector_2 != null);
  const s2B = lapsB.filter((l) => l.duration_sector_2 != null);
  const s3A = lapsA.filter((l) => l.duration_sector_3 != null);
  const s3B = lapsB.filter((l) => l.duration_sector_3 != null);

  const avgS1A = s1A.reduce((s, l) => s + (l.duration_sector_1 ?? 0), 0) / s1A.length;
  const avgS1B = s1B.reduce((s, l) => s + (l.duration_sector_1 ?? 0), 0) / s1B.length;
  const avgS2A = s2A.reduce((s, l) => s + (l.duration_sector_2 ?? 0), 0) / s2A.length;
  const avgS2B = s2B.reduce((s, l) => s + (l.duration_sector_2 ?? 0), 0) / s2B.length;
  const avgS3A = s3A.reduce((s, l) => s + (l.duration_sector_3 ?? 0), 0) / s3A.length;
  const avgS3B = s3B.reduce((s, l) => s + (l.duration_sector_3 ?? 0), 0) / s3B.length;

  return {
    driverA,
    driverB,
    lapTimeDiff: avgA - avgB,
    fastestLapDiff: (fastestA ?? 0) - (fastestB ?? 0),
    sectorsDiff: {
      sector1: avgS1A - avgS1B,
      sector2: avgS2A - avgS2B,
      sector3: avgS3A - avgS3B,
    },
  };
}

export interface StintComparison {
  driverA: number;
  driverB: number;
  stintA: number;
  stintB: number;
  paceDiff: number;
  lapCountDiff: number;
}

export function compareStints(
  stints: StintData[],
  laps: OpenF1Lap[],
  driverA: number,
  stintA: number,
  driverB: number,
  stintB: number,
): StintComparison | null {
  const sA = stints.find((s) => s.driver_number === driverA && s.stint_number === stintA);
  const sB = stints.find((s) => s.driver_number === driverB && s.stint_number === stintB);

  if (!sA || !sB) return null;

  const lapsA = laps.filter(
    (l) =>
      l.driver_number === driverA &&
      l.lap_number >= sA.lap_start &&
      l.lap_number <= sA.lap_end &&
      l.lap_duration != null,
  );
  const lapsB = laps.filter(
    (l) =>
      l.driver_number === driverB &&
      l.lap_number >= sB.lap_start &&
      l.lap_number <= sB.lap_end &&
      l.lap_duration != null,
  );

  if (lapsA.length === 0 || lapsB.length === 0) return null;

  const paceA = lapsA.reduce((s, l) => s + (l.lap_duration ?? 0), 0) / lapsA.length;
  const paceB = lapsB.reduce((s, l) => s + (l.lap_duration ?? 0), 0) / lapsB.length;

  return {
    driverA,
    driverB,
    stintA,
    stintB,
    paceDiff: paceA - paceB,
    lapCountDiff: lapsA.length - lapsB.length,
  };
}
