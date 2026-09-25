import { describe, expect, it } from "vitest";
import { buildTimeline, driverLapBlock, driverLapWindow, flagAt, lapAt, lapCrossings, raceClockAt } from "./timeline";
import australia from "../panels/tower/__fixtures__/australia.json";
import type { OpenF1Lap } from "@f1/core";
import { iso, laps, rc } from "./__fixtures__/race";

describe("buildTimeline", () => {
  const tl = buildTimeline(lapCrossings(laps));
  it("windows each lap from first start to first completion", () => {
    expect(tl.totalLaps).toBe(3);
    expect(tl.windows[1]).toEqual({ start: iso(90), end: iso(178) });
    expect(tl.windows[2]).toEqual({ start: iso(178), end: iso(267) });
  });
  it("race clock is the leader's completion time", () => {
    expect(raceClockAt(tl, 2)).toBe(178);
  });
});

describe("flagAt", () => {
  it("shows sector yellows until cleared, then green", () => {
    const rows = [
      rc(10, { flag: "DOUBLE YELLOW", scope: "Sector", sector: 14 }),
      rc(50, { flag: "CLEAR", scope: "Sector", sector: 14 }),
    ];
    expect(flagAt(rows, iso(20), 1, () => 1)).toEqual({ kind: "yellow", label: "YELLOW · SECTOR 14" });
    expect(flagAt(rows, iso(60), 1, () => 1)).toEqual({ kind: "green", label: "GREEN" });
  });
  it("holds the safety car through its 'in this lap' lap", () => {
    const rows = [
      rc(10, { category: "SafetyCar", message: "SAFETY CAR DEPLOYED", lap_number: 1 }),
      rc(100, { category: "SafetyCar", message: "SAFETY CAR IN THIS LAP", lap_number: 2 }),
    ];
    expect(flagAt(rows, iso(150), 2, () => 2).kind).toBe("sc");
    expect(flagAt(rows, iso(200), 3, () => 3).kind).toBe("green");
  });
  it("places an SC ending without lap_number by its timestamp", () => {
    const rows = [
      rc(10, { category: "SafetyCar", message: "SAFETY CAR DEPLOYED", lap_number: 1 }),
      rc(100, { category: "SafetyCar", message: "SAFETY CAR IN THIS LAP" }),
    ];
    const tl = buildTimeline(lapCrossings(laps));
    expect(flagAt(rows, iso(150), 2, (at) => lapAt(tl, at)).kind).toBe("sc");
    expect(flagAt(rows, iso(200), 3, (at) => lapAt(tl, at)).kind).toBe("green");
  });
  it("chequered beats everything but red", () => {
    expect(flagAt([rc(5, { flag: "CHEQUERED", scope: "Track" })], iso(9), 3, () => 3).label).toBe("CHEQUERED FLAG");
  });
});

describe("real race timeline", () => {
  it("ignores the cool-down lap: Australia 9693 is 57 laps", () => {
    expect(buildTimeline(lapCrossings(australia.laps as OpenF1Lap[])).totalLaps).toBe(57);
  });
});

describe("per-driver windows", () => {
  const crossings = lapCrossings(laps);
  it("a driver's lap window is their own crossings", () => {
    expect(driverLapWindow(crossings, 4, 2)).toEqual({ start: iso(91.5), end: iso(179) });
  });
  it("blocks are 10 laps, stable across the block, and null without a completed lap", () => {
    expect(driverLapBlock(crossings, 4, 3)).toEqual({ fromLap: 1, toLap: 3, window: { start: iso(0.3), end: iso(179 + 88.2) } });
    expect(driverLapBlock(crossings, 27, 3)).toBeNull();
    expect(driverLapBlock(crossings, 4, 11)).toBeNull();
  });
});
