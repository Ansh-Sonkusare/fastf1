import { describe, expect, it } from "vitest";
import { buildTimeline, driverLapBlock, driverLapWindow, flagAt, flagBands, lapAt, lapCrossings, ownLap, raceClockAt } from "./timeline";
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
  it("a driver's lap window is their own crossings", () => {
    expect(driverLapWindow(crossings, 4, 2)).toEqual({ start: iso(91.5), end: iso(179) });
  });
  it("blocks are 10 laps, stable across the block, and null without a completed lap", () => {
    expect(driverLapBlock(crossings, 4, 3)).toEqual({ fromLap: 1, toLap: 3, window: { start: iso(0.3), end: iso(179 + 88.2) } });
    expect(driverLapBlock(crossings, 27, 3)).toBeNull();
  });
});

describe("replay cursor to a lapped driver's own lap", () => {
  const vc = lapCrossings(vegas.laps as OpenF1Lap[]);
  it("Vegas 9858: when the leader completes lap 49, lapped LAW is on his lap 48", () => {
    expect(ownLap(vc, 30, 49)).toBe(48);
    expect(ownLap(vc, 1, 49)).toBe(49);
    const w = driverLapWindow(vc, 30, 49)!;
    expect([Date.parse(w.start), Date.parse(w.end!)]).toEqual([vc.get(30)![47], vc.get(30)![48]]);
  });
  it("Zandvoort 9920: at the leader's lap-31 boundary SAI stays in his own 21..30 block", () => {
    const zc = lapCrossings(zandvoort.laps as OpenF1Lap[]);
    expect(ownLap(zc, 55, 31)).toBe(30);
    expect(driverLapBlock(zc, 55, 31)).toMatchObject({ fromLap: 21, toLap: 30 });
    expect(driverLapBlock(zc, 55, 32)).toMatchObject({ fromLap: 31, toLap: 40 });
  });
});

describe("one lap rule for tower and helpers", () => {
  const ac = lapCrossings(australia.laps as OpenF1Lap[]);
  it("under SC, OCO and BEA on the lead lap at replay 39 are on their lap 39 (N4)", () => {
    expect([ownLap(ac, 31, 39), ownLap(ac, 87, 39)]).toEqual([39, 39]);
  });
  it("after a retirement the window is the last completed lap, closed; never-completed is null (N2)", () => {
    const w = driverLapWindow(ac, 30, 50)!;
    expect([Date.parse(w.start), Date.parse(w.end!)]).toEqual([ac.get(30)![45], ac.get(30)![46]]);
    expect(driverLapWindow(ac, 55, 10)).toBeNull();
  });
});

describe("flagBands", () => {
  const tl = buildTimeline(lapCrossings(laps));
  const rows = [
    rc(100, { category: "SafetyCar", message: "SAFETY CAR DEPLOYED", lap_number: 2 }),
    rc(200, { category: "SafetyCar", message: "SAFETY CAR IN THIS LAP", lap_number: 3 }),
  ];
  const at = (s: number) => Date.parse(iso(s));

  it("shows no band for a safety car deployed after the cursor", () => {
    expect(flagBands(tl, rows, at(95))).toEqual([]);
  });
  it("opens the band on the lap in progress once the safety car is out", () => {
    expect(flagBands(tl, rows, at(120))).toEqual([{ kind: "sc", fromLap: 2, toLap: 2 }]);
  });
});
