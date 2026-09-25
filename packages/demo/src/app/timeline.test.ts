import { describe, expect, it } from "vitest";
import { buildTimeline, flagAt, lapCrossings, raceClockAt } from "./timeline";
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
    expect(flagAt(rows, iso(20), 1)).toEqual({ kind: "yellow", label: "YELLOW · SECTOR 14" });
    expect(flagAt(rows, iso(60), 1)).toEqual({ kind: "green", label: "GREEN" });
  });
  it("holds the safety car through its 'in this lap' lap", () => {
    const rows = [
      rc(10, { category: "SafetyCar", message: "SAFETY CAR DEPLOYED", lap_number: 1 }),
      rc(100, { category: "SafetyCar", message: "SAFETY CAR IN THIS LAP", lap_number: 2 }),
    ];
    expect(flagAt(rows, iso(150), 2).kind).toBe("sc");
    expect(flagAt(rows, iso(200), 3).kind).toBe("green");
  });
  it("chequered beats everything but red", () => {
    expect(flagAt([rc(5, { flag: "CHEQUERED", scope: "Track" })], iso(9), 3).label).toBe("CHEQUERED FLAG");
  });
});
