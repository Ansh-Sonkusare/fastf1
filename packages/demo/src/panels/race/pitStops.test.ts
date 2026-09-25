import { describe, it, expect } from "vitest";
import { shapePitStops, getMaxPitDuration } from "./pitStops";
import { abuDhabiPits } from "./__fixtures__/pits";

const ABU_DHABI = 9839;

describe("shapePitStops (2025 Abu Dhabi GP, session 9839)", () => {
  const viewModels = shapePitStops(abuDhabiPits, ABU_DHABI);

  it("shapes 26 of the 27 fetched rows: excludes driver 27's null-duration row", () => {
    expect(viewModels).toHaveLength(26);
    expect(viewModels.some((s) => s.driverNumber === 27 && s.lapNumber === 7)).toBe(false);
  });

  it("ranks by real stationary time, fastest first: #16 lap 39 then #23 lap 8", () => {
    expect(viewModels[0]).toEqual({
      rank: 1,
      driverNumber: 16,
      lapNumber: 39,
      stopNumber: 2, // driver 16's 2nd stop this race, after lap 16's first
      stationaryDuration: 2,
      laneDuration: 20.902,
      totalDuration: 20.902,
    });
    expect(viewModels[1]).toMatchObject({
      rank: 2,
      driverNumber: 23,
      lapNumber: 8,
      stationaryDuration: 2.1,
    });
    expect(viewModels[2]).toMatchObject({
      rank: 3,
      driverNumber: 4,
      lapNumber: 16,
      stationaryDuration: 2.1,
    });
  });

  it("assigns contiguous ranks 1..26", () => {
    expect(viewModels.map((s) => s.rank)).toEqual(
      Array.from({ length: 26 }, (_, i) => i + 1)
    );
  });

  it("filters by session key", () => {
    expect(shapePitStops(abuDhabiPits, 999999)).toHaveLength(0);
  });

  it("filters out pits with no lap number", () => {
    const pitWithoutLap = { ...abuDhabiPits[0], lap_number: undefined };
    expect(shapePitStops([pitWithoutLap], ABU_DHABI)).toHaveLength(0);
  });

  it("computes the real slowest stop's total duration: driver 30, lap 21, 28.369s", () => {
    const max = getMaxPitDuration(viewModels);
    expect(max).toBe(28.369);
    const slowest = viewModels.find((s) => s.totalDuration === 28.369);
    expect(slowest).toMatchObject({ driverNumber: 30, lapNumber: 21, stationaryDuration: 8.9 });
  });

  it("handles empty pit list", () => {
    expect(getMaxPitDuration([])).toBe(30); // default
  });
});
