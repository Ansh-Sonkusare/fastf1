import { describe, expect, it } from "vitest";
import { lapCrossings, pitLanePassLaps, realPitStops } from "../../app/timeline";
import { laps, pits, stints } from "../../app/__fixtures__/race";
import type { OpenF1Lap, OpenF1Pit, RaceControl, Stint } from "@f1/core";
import { buildTower } from "./shape";
import australia from "./__fixtures__/australia.json";
import vegas from "./__fixtures__/vegas.json";
import zandvoort from "./__fixtures__/zandvoort.json";

const crossings = lapCrossings(laps);
const tower = (lap: number) => buildTower({ lap, crossings, laps, stints, stops: realPitStops(pits, stints, new Set()), retired: null });

describe("buildTower", () => {
  it("orders by laps done then completion time, with gaps and intervals", () => {
    expect(tower(1).map((r) => [r.driver, r.gap, r.interval])).toEqual([
      [1, "LEADER", null],
      [81, "+1.000", 1],
      [4, "+1.500", 0.5],
      [27, "OUT", null],
    ]);
  });
  it("marks retired cars OUT once the replay passes their last lap", () => {
    expect(tower(2).at(-1)).toMatchObject({ driver: 27, gap: "OUT" });
  });
  it("colors last/best laps and tracks tyre age and stops", () => {
    const lap2 = new Map(tower(2).map((r) => [r.driver, r]));
    expect(lap2.get(81)).toMatchObject({ last: 87.1, lastTone: "overall", bestIsOverall: true });
    expect(lap2.get(4)).toMatchObject({ last: 87.5, lastTone: "personal", compound: "SOFT", tyreAge: 5, pits: 1 });
    const lap3 = new Map(tower(3).map((r) => [r.driver, r]));
    expect(lap3.get(81)).toMatchObject({ last: 91, lastTone: "plain", best: 87.1 });
    expect(lap3.get(4)).toMatchObject({ compound: "HARD", tyreAge: 1 });
    expect(lap3.get(1)).toMatchObject({ compound: "MEDIUM", tyreAge: 3, pits: 0 });
  });
});

type Fixture = { laps: OpenF1Lap[]; result: { driver_number: number; dnf: boolean; dns: boolean }[] };
const real = (f: Fixture, lap: number) => {
  const c = lapCrossings(f.laps);
  const retired = new Set(f.result.filter((r) => r.dnf || r.dns).map((r) => r.driver_number));
  return buildTower({ lap, crossings: c, laps: f.laps, stints: [], stops: [], retired });
};
const row = (rows: ReturnType<typeof buildTower>, driver: number) => rows.find((r) => r.driver === driver);

describe("buildTower on real races", () => {
  it("Australia 9693 at the flag: NOR wins from VER, DNFs are OUT", () => {
    const rows = real(australia as Fixture, 57);
    expect(rows.slice(0, 2).map((r) => [r.driver, r.gap])).toEqual([[4, "LEADER"], [1, "+0.909"]]);
    expect(rows.filter((r) => r.gap === "OUT").map((r) => r.driver).sort((a, b) => a - b)).toEqual([5, 6, 7, 14, 30, 55]);
  });
  it("a lapped car is +1 L mid-race, with its interval to the car ahead: Vegas 9858 LAW lap 48", () => {
    expect(row(real(vegas as Fixture, 48), 30)).toMatchObject({ position: 16, gap: "+1 L", interval: 7.155 });
  });
  it("a car retiring on a lap is OUT on that lap: Vegas 9858 STR lap 1", () => {
    expect(row(real(vegas as Fixture, 1), 18)).toMatchObject({ position: 20, gap: "OUT" });
  });
  it("Zandvoort 9920 lap 30: SAI a lap down, NOR running", () => {
    const rows = real(zandvoort as Fixture, 30);
    expect(row(rows, 55)?.gap).toBe("+1 L");
    expect(row(rows, 4)?.gap).toBe("+1.865");
  });
});

describe("OUT vs lapped without classification", () => {
  const t = (driver: number, starts: number[], lastDur: number | null) =>
    starts.map((s, i) => ({
      session_key: 1, meeting_key: 1, driver_number: driver, lap_number: i + 1,
      date_start: new Date(Date.UTC(2025, 0, 1) + s * 1000).toISOString(),
      lap_duration: i === starts.length - 1 ? (lastDur ?? undefined) : 90,
    }));
  const tower = (rows: OpenF1Lap[], lap: number) =>
    buildTower({ lap, crossings: lapCrossings(rows), laps: rows, stints: [], stops: [], retired: null });

  it("a running lapped car takes the flag after the leader and is +1 L", () => {
    const rows = [...t(1, [0, 90, 180], 90), ...t(27, [45, 150], 100)];
    expect(tower(rows, 3).at(-1)).toMatchObject({ driver: 27, gap: "+1 L" });
  });
  it("a car that stopped a lap early is OUT", () => {
    const rows = [...t(1, [0, 90, 180], 90), ...t(27, [1], 90)];
    expect(tower(rows, 1).at(-1)).toMatchObject({ driver: 27, gap: "+1.000" });
    expect(tower(rows, 2).at(-1)).toMatchObject({ driver: 27, gap: "OUT" });
  });
  it("a car that never completed its lap is OUT from that lap", () => {
    const rows = [...t(1, [0, 90, 180], 90), ...t(27, [1], null)];
    expect(tower(rows, 1).at(-1)).toMatchObject({ driver: 27, gap: "OUT" });
  });
});

describe("stop count", () => {
  type Full = { laps: OpenF1Lap[]; stints: Stint[]; raceControl: RaceControl[]; pits: OpenF1Pit[] };
  const stops = (f: Full, lap: number) => {
    const rows = buildTower({
      lap,
      crossings: lapCrossings(f.laps),
      laps: f.laps,
      stints: f.stints,
      stops: realPitStops(f.pits, f.stints, pitLanePassLaps(f.raceControl)),
      retired: null,
    });
    return (driver: number) => rows.find((r) => r.driver === driver)?.pits;
  };

  it("Australia 9693: SC pit-lane drive-throughs aren't stops, real stops on those laps are", () => {
    const aus = australia as unknown as Full;
    expect([...pitLanePassLaps(aus.raceControl)]).toEqual([2, 3, 4]);
    const end = stops(aus, 57);
    expect({ NOR: end(4), BEA: end(87), OCO: end(31), LAW: end(30) }).toEqual({ NOR: 2, BEA: 3, OCO: 3, LAW: 2 });
    expect(stops(aus, 1)(30)).toBe(0);
  });
  it("a lapped car's stops count to its own lap (N1)", () => {
    const aus = australia as unknown as Full;
    expect([stops(aus, 33)(5), stops(aus, 33)(30), stops(aus, 44)(81), stops(aus, 44)(87)]).toEqual([0, 1, 1, 2]);
    expect(stops(zandvoort as unknown as Full, 51)(55)).toBe(2);
  });
  it("a pass-lap row without stop_duration counts only with a compound change (N3)", () => {
    const aus = australia as unknown as Full;
    const changed = aus.stints.map((x) =>
      x.driver_number !== 4 ? x : x.lap_start === 4 ? { ...x, compound: "HARD" } : x.lap_start === 34 ? { ...x, compound: "MEDIUM" } : x,
    );
    expect(stops(aus, 57)(4)).toBe(2);
    expect(stops({ ...aus, stints: changed }, 57)(4)).toBe(3);
  });
  it("Vegas 9858: RUS stopped once", () => {
    expect(stops(vegas as unknown as Full, 50)(63)).toBe(1);
  });
});
