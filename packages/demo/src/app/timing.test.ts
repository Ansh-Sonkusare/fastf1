import type { OpenF1Lap } from "@f1/core";
import { describe, expect, it } from "vitest";
import { iso } from "./__fixtures__/race";
import { cut } from "../data/cutoff";
import { lapCrossings } from "./timeline";
import { standingsAt, timingLines } from "./timing";

const T0 = Date.parse(iso(0));
const lap = (driver_number: number, lap_number: number, start: number, dur: number, s1: number, s2: number): OpenF1Lap => ({
  session_key: 9920,
  meeting_key: 1267,
  driver_number,
  lap_number,
  date_start: iso(start),
  lap_duration: dur,
  duration_sector_1: s1,
  duration_sector_2: s2,
  duration_sector_3: dur - s1 - s2,
});

// VER leads lap 1 by 1 s. NOR is quicker through S2 of lap 2 and passes VER before the S2 line.
const laps = [
  lap(1, 1, 0, 80, 25, 30),
  lap(4, 1, 1, 80, 25, 30),
  lap(1, 2, 80, 80, 25, 32),
  lap(4, 2, 81, 78, 25, 29),
  lap(1, 3, 160, 80, 25, 30),
  lap(4, 3, 159, 80, 25, 30),
];
const lines = timingLines(lapCrossings(laps), laps);
const at = (s: number) => standingsAt(lines, T0 + s * 1000);
const order = (s: number) => at(s).map((x) => x.driver);

describe("standingsAt", () => {
  it("reorders mid-lap when a car reaches a sector line first", () => {
    expect(order(100)).toEqual([1, 4]);
    expect(order(135.5)).toEqual([4, 1]);
  });

  it("measures gap and interval at the car's own line", () => {
    expect(at(100)[1]).toMatchObject({ driver: 4, line: 3, gap: 1, interval: 1, lapsDown: 0 });
    expect(at(137.5)[1]).toMatchObject({ driver: 1, line: 5, gap: 2 });
  });

  it("counts a passed car's gap up from when the car ahead crossed the next line", () => {
    expect(at(136)[1]).toMatchObject({ driver: 1, line: 4, gap: 1 });
  });

  it("puts every car before the start in number order", () => {
    expect(at(-5).map((x) => [x.driver, x.line, x.gap])).toEqual([
      [1, -1, null],
      [4, -1, null],
    ]);
  });
});

describe("standingsAt on rows cut at the cursor", () => {
  it("counts sector lines of the lap still in progress", () => {
    const now = T0 + 135_500;
    const visible = cut("laps", laps, { at: now, lapOf: () => 2, finished: false });
    const order = standingsAt(timingLines(lapCrossings(visible), visible), now);
    expect(order.map((s) => [s.driver, s.line])).toEqual([[4, 5], [1, 4]]);
  });
});
