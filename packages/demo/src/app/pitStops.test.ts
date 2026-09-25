import type { OpenF1Pit, RaceControl, Stint } from "@f1/core";
import { describe, expect, it } from "vitest";
import australia from "../panels/tower/__fixtures__/australia.json";
import vegas from "../panels/tower/__fixtures__/vegas.json";
import zandvoort from "../panels/tower/__fixtures__/zandvoort.json";
import { pitLanePassLaps, realPitStops } from "./timeline";

type Rows = { pits: OpenF1Pit[]; stints: Stint[]; raceControl: RaceControl[] };
const stops = (f: unknown) => {
  const r = f as Rows;
  return realPitStops(r.pits, r.stints, pitLanePassLaps(r.raceControl));
};
const of = (f: unknown, driver: number) => stops(f).filter((s) => s.driver === driver);

describe("realPitStops", () => {
  it("Australia 9693: drops the 48 SC pit-lane drive-throughs, keeps real stops on those laps", () => {
    expect(stops(australia)).toHaveLength(34);
    expect(of(australia, 4)).toEqual([
      { driver: 4, lap: 34, stationary: 2.7, lane: 18.464 },
      { driver: 4, lap: 44, stationary: 3.1, lane: 18.031 },
    ]);
    expect(of(australia, 31)[0]).toEqual({ driver: 31, lap: 4, stationary: 2.5, lane: 19.649 });
  });
  it("keeps real stops whose stop_duration is null: Vegas HUL L30, Zandvoort ANT L53", () => {
    expect(of(vegas, 27)).toContainEqual({ driver: 27, lap: 30, stationary: null, lane: 22.3 });
    expect(of(zandvoort, 12)).toContainEqual({ driver: 12, lap: 53, stationary: null, lane: 21.3 });
  });
  it("without a pit-lane pass every row with a lap is a stop", () => {
    expect([stops(vegas).length, stops(zandvoort).length]).toEqual([
      (vegas as unknown as Rows).pits.filter((p) => p.lap_number != null).length,
      (zandvoort as unknown as Rows).pits.filter((p) => p.lap_number != null).length,
    ]);
  });
});
