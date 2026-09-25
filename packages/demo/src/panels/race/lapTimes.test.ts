import { describe, it, expect } from "vitest";
import {
  shapeLapTimes,
  identifySCPeriods,
  identifyPitLaps,
  filterChartLaps,
  getDriverLapStats,
} from "./lapTimes";
import { abuDhabiLaps } from "./__fixtures__/laps";
import { abuDhabiStints } from "./__fixtures__/stints";
import { RaceControl } from "@f1/core";

describe("LapTimes shaping", () => {
  it("shapes lap data into view models", () => {
    const viewModels = shapeLapTimes(abuDhabiLaps, 9999);

    expect(viewModels.length).toBeGreaterThan(0);
    expect(viewModels[0]).toHaveProperty("lapNumber");
    expect(viewModels[0]).toHaveProperty("driverNumber");
    expect(viewModels[0]).toHaveProperty("duration");
  });

  it("includes sector times", () => {
    const viewModels = shapeLapTimes(abuDhabiLaps, 9999);
    const firstLap = viewModels[0];

    expect(firstLap.s1).toBeDefined();
    expect(firstLap.s2).toBeDefined();
    expect(firstLap.s3).toBeDefined();
  });

  it("marks pit laps correctly", () => {
    const viewModels = shapeLapTimes(abuDhabiLaps, 9999, abuDhabiStints);

    const pitLaps = viewModels.filter((l) => l.isPitLap);
    expect(pitLaps.length).toBeGreaterThan(0);
  });

  it("filters by session key", () => {
    const viewModels = shapeLapTimes(abuDhabiLaps, 999999); // wrong session

    expect(viewModels).toHaveLength(0);
  });

  it("sorts by driver then lap number", () => {
    const viewModels = shapeLapTimes(abuDhabiLaps, 9999);

    for (let i = 1; i < viewModels.length; i++) {
      const prev = viewModels[i - 1];
      const curr = viewModels[i];

      if (prev.driverNumber === curr.driverNumber) {
        expect(prev.lapNumber).toBeLessThanOrEqual(curr.lapNumber);
      }
    }
  });
});

describe("SC/VSC identification", () => {
  it("identifies SC periods from race control data", () => {
    const raceControl: RaceControl[] = [
      {
        session_key: 9999,
        meeting_key: 1234,
        date: "2025-12-08T15:06:00Z",
        category: "SAFETY CAR",
        message: "SAFETY CAR DEPLOYED",
        lap_number: 4,
      },
      {
        session_key: 9999,
        meeting_key: 1234,
        date: "2025-12-08T15:08:00Z",
        category: "SAFETY CAR",
        message: "SAFETY CAR ENDED",
        lap_number: 5,
      },
    ];

    const periods = identifySCPeriods(raceControl, 9999);

    expect(periods).toHaveLength(1);
    expect(periods[0]).toEqual([4, 5]);
  });

  it("handles empty race control data", () => {
    const periods = identifySCPeriods([], 9999);

    expect(periods).toHaveLength(0);
  });

  it("marks laps as slowed if in SC period", () => {
    const raceControl: RaceControl[] = [
      {
        session_key: 9999,
        meeting_key: 1234,
        date: "2025-12-08T15:06:00Z",
        category: "SAFETY CAR",
        message: "SAFETY CAR DEPLOYED",
        lap_number: 4,
      },
      {
        session_key: 9999,
        meeting_key: 1234,
        date: "2025-12-08T15:08:00Z",
        category: "SAFETY CAR",
        message: "SAFETY CAR ENDED",
        lap_number: 5,
      },
    ];

    const viewModels = shapeLapTimes(abuDhabiLaps, 9999, [], raceControl);

    const lap4 = viewModels.find((l) => l.lapNumber === 4);
    expect(lap4?.isSlowed).toBe(true);
  });
});

describe("Pit lap identification", () => {
  it("identifies pit laps from stints", () => {
    const pitLaps = identifyPitLaps(abuDhabiStints, 9999);

    expect(pitLaps.has(6)).toBe(true); // end of first stint
    expect(pitLaps.has(27)).toBe(true); // end of second stint
  });

  it("handles empty stints", () => {
    const pitLaps = identifyPitLaps([], 9999);

    expect(pitLaps.size).toBe(0);
  });
});

describe("Chart filtering", () => {
  it("filters out SC and pit laps for chart", () => {
    const raceControl: RaceControl[] = [
      {
        session_key: 9999,
        meeting_key: 1234,
        date: "2025-12-08T15:06:00Z",
        category: "SAFETY CAR",
        message: "SAFETY CAR DEPLOYED",
        lap_number: 4,
      },
      {
        session_key: 9999,
        meeting_key: 1234,
        date: "2025-12-08T15:08:00Z",
        category: "SAFETY CAR",
        message: "SAFETY CAR ENDED",
        lap_number: 5,
      },
    ];

    const viewModels = shapeLapTimes(
      abuDhabiLaps,
      9999,
      abuDhabiStints,
      raceControl
    );
    const chartLaps = filterChartLaps(viewModels);

    // Should not include pit laps or SC laps
    const hasSlowedOrPit = chartLaps.some((l) => l.isSlowed || l.isPitLap);
    expect(hasSlowedOrPit).toBe(false);
  });
});

describe("Lap statistics", () => {
  it("calculates driver lap statistics", () => {
    const viewModels = shapeLapTimes(abuDhabiLaps, 9999, [], []);

    const stats = getDriverLapStats(viewModels, 1);

    expect(stats.bestLap).toBeDefined();
    expect(stats.avgLap).toBeDefined();
    expect(stats.lastLap).toBeDefined();
    expect(stats.bestLap).toBeLessThanOrEqual(stats.avgLap!);
  });

  it("returns null for driver with no laps", () => {
    const viewModels = shapeLapTimes(abuDhabiLaps, 9999);

    const stats = getDriverLapStats(viewModels, 999);

    expect(stats.bestLap).toBeNull();
    expect(stats.avgLap).toBeNull();
    expect(stats.lastLap).toBeNull();
  });
});
