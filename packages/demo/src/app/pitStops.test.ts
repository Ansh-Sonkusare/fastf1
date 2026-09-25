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

describe("realPitStops pass-lap confirmation (hand-built)", () => {
  const pit = (lap: number, stop: number | null): OpenF1Pit => ({
    session_key: 1, meeting_key: 1, driver_number: 7, lap_number: lap, stop_duration: stop ?? undefined, lane_duration: 20,
  });
  const stint = (n: number, from: number, to: number, compound: string): Stint => ({
    session_key: 1, meeting_key: 1, driver_number: 7, stint_number: n, lap_start: from, lap_end: to, compound, tyre_age_at_start: 0,
  });
  it("a new compound starting the lap after an untimed pass-lap row confirms it", () => {
    const stops = realPitStops([pit(20, null)], [stint(1, 1, 20, "MEDIUM"), stint(2, 21, 50, "HARD")], new Set([20]));
    expect(stops.map((s) => s.lap)).toEqual([20]);
  });
  it("a multi-lap pass with one compound change counts one stop, not two", () => {
    const stops = realPitStops(
      [pit(2, null), pit(3, null), pit(4, null)],
      [stint(1, 1, 2, "INTERMEDIATE"), stint(2, 3, 30, "HARD")],
      new Set([2, 3, 4]),
    );
    expect(stops.map((s) => s.lap)).toEqual([2]);
  });
  it("a timed stop claims its compound change before an untimed pass row can", () => {
    const stops = realPitStops(
      [pit(3, null), pit(4, 2.4)],
      [stint(1, 1, 3, "INTERMEDIATE"), stint(2, 4, 30, "HARD")],
      new Set([2, 3, 4]),
    );
    expect(stops.map((s) => [s.lap, s.stationary])).toEqual([[4, 2.4]]);
  });
});
