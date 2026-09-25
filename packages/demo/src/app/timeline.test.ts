import { describe, expect, it } from "vitest";
import { buildTimeline, driverLapBlock, driverLapWindow, flagAt, lapAt, lapCrossings, ownLap, raceClockAt } from "./timeline";
import vegas from "../panels/tower/__fixtures__/vegas.json";
import zandvoort from "../panels/tower/__fixtures__/zandvoort.json";
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
  const tl = buildTimeline(crossings);
  it("a driver's lap window is their own crossings", () => {
    expect(driverLapWindow(crossings, tl, 4, 2)).toEqual({ start: iso(91.5), end: iso(179) });
  });
  it("blocks are 10 laps, stable across the block, and null without a completed lap", () => {
    expect(driverLapBlock(crossings, tl, 4, 3)).toEqual({ fromLap: 1, toLap: 3, window: { start: iso(0.3), end: iso(179 + 88.2) } });
    expect(driverLapBlock(crossings, tl, 27, 3)).toBeNull();
  });
});

describe("replay cursor to a lapped driver's own lap", () => {
  const vc = lapCrossings(vegas.laps as OpenF1Lap[]);
  const vt = buildTimeline(vc);
  it("Vegas 9858: when the leader completes lap 49, lapped LAW is on his lap 48", () => {
    expect(ownLap(vc, vt, 30, 49)).toBe(48);
    expect(ownLap(vc, vt, 1, 49)).toBe(49);
    const w = driverLapWindow(vc, vt, 30, 49)!;
    expect([Date.parse(w.start), Date.parse(w.end!)]).toEqual([vc.get(30)![47], vc.get(30)![48]]);
  });
  it("Zandvoort 9920: at the leader's lap-31 boundary SAI stays in his own 21..30 block", () => {
    const zc = lapCrossings(zandvoort.laps as OpenF1Lap[]);
    const zt = buildTimeline(zc);
    expect(ownLap(zc, zt, 55, 31)).toBe(30);
    expect(driverLapBlock(zc, zt, 55, 31)).toMatchObject({ fromLap: 21, toLap: 30 });
    expect(driverLapBlock(zc, zt, 55, 32)).toMatchObject({ fromLap: 31, toLap: 40 });
  });
});
