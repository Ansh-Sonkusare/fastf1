import { describe, it, expect } from "vitest";
import {
  shapeLapTimes,
  identifySCPeriods,
  identifyPitLaps,
  filterChartLaps,
  getDriverLapStats,
} from "./lapTimes";
import { abuDhabiLaps, monzaLaps } from "./__fixtures__/laps";
import { abuDhabiStints } from "./__fixtures__/stints";
import { abuDhabiRaceControl, monzaRaceControl } from "./__fixtures__/raceControl";
import type { RaceControl } from "@f1/core";

const ABU_DHABI = 9839;
const MONZA = 9912;
const VER = 1;
const NOR = 4;

describe("shapeLapTimes (2025 Abu Dhabi GP, session 9839)", () => {
  const viewModels = shapeLapTimes(abuDhabiLaps, ABU_DHABI, abuDhabiStints, abuDhabiRaceControl);

  it("shapes every fetched lap for VER and NOR", () => {
    expect(viewModels).toHaveLength(116); // 58 laps VER + 58 laps NOR
  });

  it("carries VER's real sector times for lap 1", () => {
    const lap1 = viewModels.find((l) => l.driverNumber === VER && l.lapNumber === 1);
    expect(lap1).toMatchObject({
      duration: 91.994,
      s1: expect.any(Number),
      s2: expect.any(Number),
      s3: expect.any(Number),
    });
  });

  it("marks VER's pit-in lap (23) and pit-out lap (24) as pit laps", () => {
    const lap23 = viewModels.find((l) => l.driverNumber === VER && l.lapNumber === 23);
    const lap24 = viewModels.find((l) => l.driverNumber === VER && l.lapNumber === 24);
    const lap22 = viewModels.find((l) => l.driverNumber === VER && l.lapNumber === 22);

    expect(lap23?.isPitLap).toBe(true); // stint 1 (MEDIUM) ends lap 23
    expect(lap24?.isPitLap).toBe(true); // is_pit_out_lap from OpenF1
    expect(lap22?.isPitLap).toBe(false);
  });

  it("marks NOR's two real pit laps (16, 40)", () => {
    const pitLaps = viewModels.filter((l) => l.driverNumber === NOR && l.isPitLap);
    expect(pitLaps.map((l) => l.lapNumber).sort((a, b) => a - b)).toEqual([16, 17, 40, 41]);
  });

  it("filters by session key", () => {
    expect(shapeLapTimes(abuDhabiLaps, 999999)).toHaveLength(0);
  });

  it("sorts by driver then lap number", () => {
    for (let i = 1; i < viewModels.length; i++) {
      const prev = viewModels[i - 1];
      const curr = viewModels[i];
      if (prev.driverNumber === curr.driverNumber) {
        expect(prev.lapNumber).toBeLessThanOrEqual(curr.lapNumber);
      }
    }
  });
});

describe("SC/VSC periods, real race_control", () => {
  it("finds no SC/VSC period in 2025 Abu Dhabi (no track-wide yellow was ever raised)", () => {
    expect(identifySCPeriods(abuDhabiRaceControl, ABU_DHABI)).toEqual([]);
  });

  it("finds no SC/VSC period in 2025 Monza (same: only local sector yellows)", () => {
    expect(identifySCPeriods(monzaRaceControl, MONZA)).toEqual([]);
  });

  it("consequently marks no Abu Dhabi lap as SC/VSC-slowed", () => {
    const viewModels = shapeLapTimes(abuDhabiLaps, ABU_DHABI, abuDhabiStints, abuDhabiRaceControl);
    expect(viewModels.every((l) => !l.isSlowed)).toBe(true);
  });

  it("consequently marks no Monza lap as SC/VSC-slowed either", () => {
    const viewModels = shapeLapTimes(monzaLaps, MONZA, [], monzaRaceControl);
    expect(viewModels.length).toBeGreaterThan(0);
    expect(viewModels.every((l) => !l.isSlowed)).toBe(true);
  });

  // Neither real race exercises the positive branch (no SC/VSC was called),
  // so the algorithm itself is verified here against a constructed track-wide
  // yellow-to-green pair, using the real schema's field shape.
  it("detects a track-wide yellow-to-green pair as one SC/VSC period", () => {
    const raceControl: RaceControl[] = [
      {
        session_key: ABU_DHABI,
        meeting_key: 1276,
        date: "2025-12-07T13:40:00+00:00",
        category: "Flag",
        flag: "YELLOW",
        scope: "Track",
        lap_number: 25,
        message: "SAFETY CAR DEPLOYED",
      },
      {
        session_key: ABU_DHABI,
        meeting_key: 1276,
        date: "2025-12-07T13:44:00+00:00",
        category: "Flag",
        flag: "GREEN",
        scope: "Track",
        lap_number: 27,
        message: "GREEN LIGHT - PIT EXIT OPEN",
      },
    ];

    expect(identifySCPeriods(raceControl, ABU_DHABI)).toEqual([[25, 27]]);
  });

  it("does not treat a local sector double-yellow as a field-wide period", () => {
    const raceControl: RaceControl[] = [
      {
        session_key: ABU_DHABI,
        meeting_key: 1276,
        date: "2025-12-07T13:00:00+00:00",
        category: "Flag",
        flag: "DOUBLE YELLOW",
        scope: "Sector",
        sector: 14,
        lap_number: 1,
        message: "DOUBLE YELLOW IN TRACK SECTOR 14",
      },
    ];

    expect(identifySCPeriods(raceControl, ABU_DHABI)).toEqual([]);
  });
});

describe("identifyPitLaps", () => {
  it("identifies VER's and NOR's real pit-in laps, per driver", () => {
    const pitLaps = identifyPitLaps(abuDhabiStints, ABU_DHABI);
    expect(pitLaps.get(VER)).toEqual(new Set([23]));
    expect(pitLaps.get(NOR)).toEqual(new Set([16, 40]));
  });

  it("does not mark a driver's final stint's last lap as a pit lap", () => {
    const pitLaps = identifyPitLaps(abuDhabiStints, ABU_DHABI);
    expect(pitLaps.get(VER)?.has(58)).toBe(false); // VER's last lap of the race
  });

  it("does not leak one driver's pit lap onto another driver's lap", () => {
    // Lap 39 is driver 16's pit lap (see pitStops.test.ts's rank-1 stop), not VER's.
    const pitLaps = identifyPitLaps(abuDhabiStints, ABU_DHABI);
    expect(pitLaps.get(VER)?.has(39)).toBe(false);
  });

  it("handles empty stints", () => {
    expect(identifyPitLaps([], ABU_DHABI).size).toBe(0);
  });
});

describe("filterChartLaps", () => {
  it("clips VER's real pit laps from the chart series", () => {
    const viewModels = shapeLapTimes(abuDhabiLaps, ABU_DHABI, abuDhabiStints, abuDhabiRaceControl);
    const chartLaps = filterChartLaps(viewModels).filter((l) => l.driverNumber === VER);

    expect(chartLaps.some((l) => l.lapNumber === 23 || l.lapNumber === 24)).toBe(false);
    expect(chartLaps).toHaveLength(56); // 58 laps minus the 2 clipped pit laps
  });
});

describe("getDriverLapStats", () => {
  it("computes VER's real best/avg/last lap over the fetched race laps", () => {
    const viewModels = shapeLapTimes(abuDhabiLaps, ABU_DHABI, abuDhabiStints, abuDhabiRaceControl);
    const stats = getDriverLapStats(viewModels, VER);

    expect(stats.bestLap).toBe(87.625);
    expect(stats.lastLap).toBe(88.473); // lap 58, the final lap fetched
    expect(stats.bestLap).toBeLessThanOrEqual(stats.avgLap!);
  });

  it("returns null for a driver with no laps in the fixture", () => {
    const viewModels = shapeLapTimes(abuDhabiLaps, ABU_DHABI);
    const stats = getDriverLapStats(viewModels, 999);

    expect(stats).toEqual({ bestLap: null, avgLap: null, lastLap: null });
  });
});
