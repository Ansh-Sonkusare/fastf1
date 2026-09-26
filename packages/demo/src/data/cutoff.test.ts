import type { OpenF1Lap, SessionResult, Weather } from "@f1/core";
import { describe, expect, it } from "vitest";
import { iso, laps, pits, rc, stints } from "../app/__fixtures__/race";
import { buildTimeline, cursorAt, lapCrossings } from "../app/timeline";
import { cut, OMNISCIENT } from "./cutoff";

const crossings = lapCrossings(laps);
const timeline = buildTimeline(crossings);
const T0 = Date.parse(iso(0));
const at = (s: number) => cursorAt(crossings, timeline, T0 + s * 1000);

const sectored: OpenF1Lap = {
  session_key: 9839,
  meeting_key: 1276,
  driver_number: 1,
  lap_number: 2,
  date_start: iso(90),
  lap_duration: 88,
  duration_sector_1: 30,
  duration_sector_2: 31,
  duration_sector_3: 27,
  i1_speed: 290,
  i2_speed: 250,
  st_speed: 320,
};
const withSectors = [laps[0]!, sectored, laps[2]!];

describe("cut", () => {
  it("keeps race control messages dated at or before the cursor", () => {
    const rows = [rc(10, { message: "GREEN" }), rc(95, { message: "YELLOW" }), rc(200, { message: "CHEQUERED" })];
    expect(cut("race_control", rows, at(95)).map((r) => r.message)).toEqual(["GREEN", "YELLOW"]);
    expect(cut("race_control", rows, at(94.9)).map((r) => r.message)).toEqual(["GREEN"]);
  });

  it("drops weather samples after the cursor", () => {
    const w = (s: number, air: number): Weather => ({ session_key: 9839, meeting_key: 1276, date: iso(s), air_temperature: air });
    expect(cut("weather", [w(0, 26), w(60, 27), w(120, 28)], at(100)).map((r) => r.air_temperature)).toEqual([26, 27]);
  });

  it("reveals the lap in progress one sector line at a time", () => {
    const shown = (s: number) => cut("laps", withSectors, at(s)).find((l) => l.lap_number === 2);
    expect(shown(100)).toMatchObject({ lap_duration: undefined, duration_sector_1: undefined, i1_speed: undefined });
    expect(shown(125)).toMatchObject({ duration_sector_1: 30, i1_speed: 290, duration_sector_2: undefined, lap_duration: undefined });
    expect(shown(170)).toMatchObject({ duration_sector_1: 30, duration_sector_2: 31, i2_speed: 250, duration_sector_3: undefined, st_speed: undefined });
    expect(shown(178)).toMatchObject({ lap_duration: 88, duration_sector_3: 27, st_speed: 320 });
  });

  it("hides laps not started yet", () => {
    expect(cut("laps", laps, at(50)).map((l) => `${l.driver_number}:${l.lap_number}`)).toEqual(["1:1", "4:1", "81:1", "27:1"]);
    expect(cut("laps", laps, at(-1))).toEqual([]);
  });

  it("returns the same masked row while nothing new is revealed", () => {
    const a = cut("laps", withSectors, at(100)).find((l) => l.lap_number === 2);
    const b = cut("laps", withSectors, at(110)).find((l) => l.lap_number === 2);
    expect(a).toBe(b);
  });

  it("clips a stint to the lap being run", () => {
    expect(cut("stints", stints, at(100)).map((s) => [s.driver_number, s.lap_start, s.lap_end])).toEqual([
      [1, 1, 2],
      [4, 1, 2],
    ]);
  });

  it("shows a stop once its lap is done when the stop has no timestamp", () => {
    expect(cut("pit", pits, at(100))).toEqual([]);
    expect(cut("pit", pits, at(180))).toHaveLength(1);
  });

  it("hides the classification until the flag", () => {
    const result: SessionResult[] = [
      { session_key: 9839, meeting_key: 1276, driver_number: 1, position: 1, number_of_laps: 3, dnf: false, dns: false, dsq: false },
    ];
    expect(cut("session_result", result, at(200))).toEqual([]);
    expect(cut("session_result", result, at(267))).toEqual(result);
  });

  it("passes everything through for the omniscient cursor", () => {
    expect(cut("laps", laps, OMNISCIENT)).toBe(laps);
  });
});
