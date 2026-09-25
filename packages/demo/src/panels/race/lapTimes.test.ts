import { describe, it, expect } from "vitest";
import {
  shapeLapTimes,
  identifySCPeriods,
  identifyPitLaps,
  filterChartLaps,
  getDriverLapStats,
} from "./lapTimes";
import { abuDhabiLaps, monzaLaps } from "./__fixtures__/laps";
import { abuDhabiPits } from "./__fixtures__/pits";
import { abuDhabiRaceControl, monzaRaceControl } from "./__fixtures__/raceControl";
import type { RaceControl } from "@f1/core";

const ABU_DHABI = 9839;
const MONZA = 9912;
const VER = 1;
const NOR = 4;

describe("shapeLapTimes (2025 Abu Dhabi GP, session 9839)", () => {
  const viewModels = shapeLapTimes(abuDhabiLaps, ABU_DHABI, abuDhabiPits, abuDhabiRaceControl);

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

    expect(lap23?.isPitLap).toBe(true); // VER's real pit row, lap 23
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
    const badPair = viewModels
      .slice(1)
      .find((curr, i) => curr.driverNumber === viewModels[i].driverNumber && curr.lapNumber < viewModels[i].lapNumber);
    expect(badPair).toBeUndefined();
  });
});

describe("SC/VSC periods, real race_control", () => {
  it("finds no SC/VSC period in either real race (no SafetyCar-category row at all)", () => {
    expect(identifySCPeriods(abuDhabiRaceControl, ABU_DHABI)).toEqual([]);
    expect(identifySCPeriods(monzaRaceControl, MONZA)).toEqual([]);
  });

  it("consequently marks no lap as SC/VSC-slowed in either race", () => {
    const ad = shapeLapTimes(abuDhabiLaps, ABU_DHABI, abuDhabiPits, abuDhabiRaceControl);
    const mz = shapeLapTimes(monzaLaps, MONZA, [], monzaRaceControl);
    expect(ad.length).toBeGreaterThan(0);
    expect(mz.length).toBeGreaterThan(0);
    expect([...ad, ...mz].every((l) => !l.isSlowed)).toBe(true);
  });

  // Neither real race exercises the positive branch (no SafetyCar row at
  // all), so the algorithm is verified against the same category/message
  // shape app/timeline.ts's flagAt uses on real SC sessions.
  it("detects a DEPLOYED-to-ENDING pair as one SC/VSC period", () => {
    const raceControl: RaceControl[] = [
      {
        session_key: ABU_DHABI,
        meeting_key: 1276,
        date: "2025-12-07T13:40:00+00:00",
        category: "SafetyCar",
        message: "SAFETY CAR DEPLOYED",
        lap_number: 25,
      },
      {
        session_key: ABU_DHABI,
        meeting_key: 1276,
        date: "2025-12-07T13:44:00+00:00",
        category: "SafetyCar",
        message: "SAFETY CAR ENDING",
        lap_number: 27,
      },
    ];

    expect(identifySCPeriods(raceControl, ABU_DHABI)).toEqual([[25, 27]]);
  });

  it("ignores an ordinary local sector double-yellow (category Flag, not SafetyCar)", () => {
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
  it("identifies VER's and NOR's real pit-in laps, per driver only", () => {
    const pitLaps = identifyPitLaps(abuDhabiPits, ABU_DHABI);
    expect(pitLaps.get(VER)).toEqual(new Set([23]));
    expect(pitLaps.get(NOR)).toEqual(new Set([16, 40]));
    expect(pitLaps.get(VER)?.has(58)).toBe(false); // VER's last lap of the race
    // Lap 39 is driver 16's pit lap (pitStops.test.ts's rank-1 stop), not VER's.
    expect(pitLaps.get(VER)?.has(39)).toBe(false);
  });

  it("handles empty pit rows", () => {
    expect(identifyPitLaps([], ABU_DHABI).size).toBe(0);
  });
});

describe("filterChartLaps", () => {
  it("clips VER's real pit laps from the chart series", () => {
    const viewModels = shapeLapTimes(abuDhabiLaps, ABU_DHABI, abuDhabiPits, abuDhabiRaceControl);
    const chartLaps = filterChartLaps(viewModels).filter((l) => l.driverNumber === VER);

    expect(chartLaps.some((l) => l.lapNumber === 23 || l.lapNumber === 24)).toBe(false);
    expect(chartLaps).toHaveLength(56); // 58 laps minus the 2 clipped pit laps
  });
});

describe("getDriverLapStats", () => {
  it("computes VER's real best/avg/last lap over the fetched race laps", () => {
    const viewModels = shapeLapTimes(abuDhabiLaps, ABU_DHABI, abuDhabiPits, abuDhabiRaceControl);
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
