import { describe, it, expect } from "vitest";
import { pitLanePassLaps, realPitStops } from "../../app/timeline";
import { shapePitStops, getMaxPitDuration } from "./pitStops";
import { abuDhabiPits } from "./__fixtures__/pits";
import { abuDhabiStints } from "./__fixtures__/stints";
import { abuDhabiRaceControl } from "./__fixtures__/raceControl";

describe("shapePitStops (2025 Abu Dhabi GP, session 9839)", () => {
  const pitStops = realPitStops(abuDhabiPits, abuDhabiStints, pitLanePassLaps(abuDhabiRaceControl));
  const viewModels = shapePitStops(pitStops);

  it("shapes every real stop (27: no SC pit-lane pass this race, so nothing is excluded)", () => {
    expect(viewModels).toHaveLength(27);
  });

  it("keeps HUL's real L7 stop despite its null stop_duration", () => {
    // A null stop_duration isn't proof of a non-stop: this is a real, timed
    // pit visit that OpenF1 just didn't record a stationary time for (same
    // as Vegas HUL L30 and Zandvoort ANT L53). realPitStops (app/timeline.ts)
    // only excludes a row on a pitLanePassLaps lap with no stop_duration AND
    // no compound change; Abu Dhabi had no SC pit-lane pass at all.
    const hul = viewModels.find((s) => s.driverNumber === 27 && s.lapNumber === 7);
    expect(hul).toMatchObject({ stationaryDuration: null, laneDuration: 21.6 });
  });

  it("ranks by real stationary time, fastest first: #16 lap 39 then #23 lap 8", () => {
    expect(viewModels[0]).toEqual({
      rank: 1,
      driverNumber: 16,
      lapNumber: 39,
      stopNumber: 2, // driver 16's 2nd stop this race, after lap 16's first
      stationaryDuration: 2,
      laneDuration: 20.902,
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

  it("assigns contiguous ranks 1..27, with HUL's null-duration stop sorted last", () => {
    expect(viewModels.map((s) => s.rank)).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
    expect(viewModels[26]).toMatchObject({ driverNumber: 27, lapNumber: 7 });
  });

  it("computes the real slowest stop's lane duration: driver 30, lap 21, 28.369s", () => {
    const max = getMaxPitDuration(viewModels);
    expect(max).toBe(28.369);
    const slowest = viewModels.find((s) => s.laneDuration === 28.369);
    expect(slowest).toMatchObject({ driverNumber: 30, lapNumber: 21, stationaryDuration: 8.9 });
  });

  it("handles empty pit list", () => {
    expect(getMaxPitDuration([])).toBe(30); // default
  });
});
