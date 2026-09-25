import { describe, expect, it } from "vitest";
import { ABU_DHABI, MONZA, type RaceFixture } from "./__fixtures__";
import { buildTrace, readout, telemetryView } from "./telemetry";
import { pickReferenceLap, runs } from "./track";

const lap10 = (race: RaceFixture, driver: number) => race.laps.find((l) => l.lap_number === 10 && l.driver_number === driver)!;
const traces = (race: RaceFixture) => ({
  a: buildTrace(lap10(race, 1), race.lap10.a)!,
  b: buildTrace(lap10(race, 4), race.lap10.b)!,
});

describe("buildTrace", () => {
  it("spans the whole lap and integrates speed to roughly the circuit length", () => {
    const { a } = traces(ABU_DHABI);
    expect(a.time[0]).toBe(0);
    expect(a.time.at(-1)).toBeCloseTo(89.465, 3);
    expect(Math.round(a.lengthM)).toBe(5216);
    expect(Math.max(...a.speed)).toBe(310);
    expect([Math.min(...a.gear), Math.max(...a.gear)]).toEqual([2, 8]);
  });

  it("marks where DRS was open on a lap in DRS range", () => {
    const ref = pickReferenceLap(MONZA.laps)!;
    expect(runs(buildTrace(ref, MONZA.refLap.carData)!.drs)).toEqual([
      [0, 35],
      [159, 189],
    ]);
  });

  it("returns null when the lap has no timing", () => {
    expect(buildTrace({ ...lap10(MONZA, 1), lap_duration: undefined }, MONZA.lap10.a)).toBe(null);
  });
});

describe("readout", () => {
  it("shows the lap-time difference at the line until hovered", () => {
    const { a, b } = traces(ABU_DHABI);
    expect(readout(a, b, null)).toBe("Δ at line -0.170s · hover to scrub");
  });

  it("shows distance, speeds, gears and delta at the hovered point", () => {
    const { a, b } = traces(MONZA);
    expect(readout(a, b, 150)).toBe("2882 m · 197 / 199 km/h · G5/5 · Δ -0.041s");
  });
});

describe("telemetryView", () => {
  it("places sector boundaries where A's lap clock crosses the sector times", () => {
    const { a, b } = traces(ABU_DHABI);
    const view = telemetryView(a, b, lap10(ABU_DHABI, 1));
    expect(view.sectors.map((s) => [s.label, s.x.toFixed(1)])).toEqual([
      ["S1", "236.2"],
      ["S2", "614.2"],
    ]);
    expect(view.lanes.map((l) => l.label)).toEqual(["KM/H", "THR %", "BRK", "GEAR", "Δ 0.3s"]);
    expect(view.paths.map((p) => p.who).join("")).toBe("BBBBAAAAΔ");
    expect(view.deltaAtLine).toBeCloseTo(-0.17, 3);
  });

  it("maps a hover x back to the nearest grid index", () => {
    const { a, b } = traces(MONZA);
    const view = telemetryView(a, b, lap10(MONZA, 1));
    expect([view.indexAt(40), view.indexAt(465), view.indexAt(2000)]).toEqual([0, 150, 299]);
  });
});
