import { describe, expect, it } from "vitest";
import { ABU_DHABI, MONZA, type RaceFixture } from "./__fixtures__";
import { cut } from "../../data/cutoff";
import { activeYellows, buildTrackGeometry, carPositions, pointAt, yellowsDuring, fitToView, pickReferenceLap, trackView } from "./track";

const geometry = (race: RaceFixture) => buildTrackGeometry(pickReferenceLap(race.laps)!, race.refLap.location, race.refLap.carData);

describe("pickReferenceLap", () => {
  it("picks the lap fetch.mjs traced: within a second of the car ahead at both lines", () => {
    const pick = (race: RaceFixture) => {
      const lap = pickReferenceLap(race.laps)!;
      return [lap.driver_number, lap.lap_number];
    };
    expect(pick(ABU_DHABI)).toEqual([27, 4]);
    expect(pick(MONZA)).toEqual([30, 4]);
  });
});

describe("buildTrackGeometry", () => {
  it("finds Yas Marina's two DRS zones and splits sectors by the lap's sector times", () => {
    const g = geometry(ABU_DHABI);
    expect(g.points).toHaveLength(341);
    expect(g.sectorStarts).toEqual([71, 211]);
    expect(g.drs).toEqual([
      [108, 135],
      [181, 210],
    ]);
  });

  it("ignores samples from the laps around it, as in a 10-lap block", () => {
    const lap = pickReferenceLap(ABU_DHABI.laps)!;
    const shift = (rows: readonly { date: string }[], s: number) =>
      rows.map((r) => ({ ...r, date: new Date(Date.parse(r.date) + s * 1000).toISOString() }));
    const { location, carData } = ABU_DHABI.refLap;
    const block = buildTrackGeometry(
      lap,
      [...shift(location, -95), ...location, ...shift(location, 95)] as typeof location,
      [...shift(carData, 95), ...carData] as typeof carData,
    );
    expect(block).toEqual(geometry(ABU_DHABI));
  });

  it("finds Monza's start-finish DRS zone at the start of the lap", () => {
    const g = geometry(MONZA);
    expect(g.sectorStarts).toEqual([100, 214]);
    expect(g.drs).toEqual([
      [0, 23],
      [184, 210],
    ]);
  });
});

describe("activeYellows", () => {
  it("replays yellow and clear messages per marshal sector", () => {
    expect([...activeYellows(MONZA.raceControl, "2025-09-07T12:32:30Z")]).toEqual([
      [7, "YELLOW"],
      [8, "YELLOW"],
      [9, "YELLOW"],
      [11, "YELLOW"],
    ]);
    expect([...activeYellows(MONZA.raceControl, "2025-09-07T13:59:20Z")]).toEqual([[7, "DOUBLE YELLOW"]]);
    expect([...activeYellows(MONZA.raceControl, "2025-09-07T13:59:31Z")]).toEqual([]);
  });

  it("has the pre-race Abu Dhabi double yellow cleared by lap 10", () => {
    expect([...activeYellows(ABU_DHABI.raceControl, "2025-12-07T12:51:50Z")]).toEqual([[14, "DOUBLE YELLOW"]]);
    expect([...activeYellows(ABU_DHABI.raceControl, "2025-12-07T13:17:30Z")]).toEqual([]);
  });
});

describe("yellowsDuring", () => {
  it("keeps a yellow raised and cleared inside the window, preferring the double", () => {
    expect([...yellowsDuring(MONZA.raceControl, "2025-09-07T13:58:00Z", "2025-09-07T14:00:00Z")]).toEqual([
      [6, "YELLOW"],
      [7, "DOUBLE YELLOW"],
    ]);
    expect([...yellowsDuring(MONZA.raceControl, "2025-09-07T14:00:00Z", "2025-09-07T14:02:00Z")]).toEqual([]);
  });
});

describe("fitToView", () => {
  const square = [
    [0, 0],
    [100, 0],
    [100, 100],
    [0, 100],
  ] as const;
  const view = { width: 200, height: 100, pad: 0 };

  it("flips y and centres the track in the viewport", () => {
    const project = fitToView(square, 0, view);
    expect(project([0, 0])).toEqual([50, 100]);
    expect(project([100, 100])).toEqual([150, 0]);
  });

  it("applies the circuit rotation before fitting", () => {
    const [x, y] = fitToView(square, 90, view)([100, 0]);
    expect([Math.round(x), Math.round(y)]).toEqual([150, 0]);
  });
});

describe("carPositions", () => {
  it("places cars within 70 m of where OpenF1 location measured them, from sector times alone", () => {
    const cases = [
      [ABU_DHABI, "2025-12-07T13:17:30.500Z"],
      [MONZA, "2025-09-07T13:16:50.500Z"],
    ] as const;
    const errors = cases.flatMap(([race, at]) => {
      const g = geometry(race);
      return carPositions(race.laps, at, g).map(({ number, index }) => {
        const [x, y] = pointAt(g.points, index);
        const measured = race.lap10.snapshot
          .filter((r) => r.driver_number === number)
          .sort((a, b) => Math.abs(Date.parse(a.date) - Date.parse(at)) - Math.abs(Date.parse(b.date) - Date.parse(at)))[0]!;
        return [number, Math.round(Math.hypot(x - measured.x, y - measured.y) / 10)];
      });
    });
    expect(errors).toEqual([
      [1, 64],
      [4, 58],
      [1, 29],
      [4, 17],
    ]);
  });

  it("estimates the lap in progress from the latest completed lap when the cursor hides its times", () => {
    const at = "2025-12-07T13:17:30.500Z";
    const known = cut("laps", ABU_DHABI.laps, { at: Date.parse(at), lapOf: () => 10, finished: false });
    expect(known.find((l) => l.driver_number === 1 && l.lap_number === 10)?.lap_duration).toBeUndefined();
    const g = geometry(ABU_DHABI);
    const errors = carPositions(known, at, g).map(({ number, index }) => {
      const [x, y] = pointAt(g.points, index);
      const measured = ABU_DHABI.lap10.snapshot
        .filter((r) => r.driver_number === number)
        .sort((a, b) => Math.abs(Date.parse(a.date) - Date.parse(at)) - Math.abs(Date.parse(b.date) - Date.parse(at)))[0]!;
      return [number, Math.round(Math.hypot(x - measured.x, y - measured.y) / 10)];
    });
    expect(errors).toEqual([
      [1, 58],
      [4, 55],
    ]);
  });

  it("counts a car once while its previous lap overlaps the next at the line", () => {
    const at = "2025-12-07T13:04:59.5775Z";
    expect(carPositions(ABU_DHABI.laps, at, geometry(ABU_DHABI)).filter((p) => p.number === 1)).toEqual([{ number: 1, index: 0 }]);
  });

  it("leaves out cars that are not on a timed lap", () => {
    expect(carPositions(ABU_DHABI.laps, "2025-12-07T12:00:00Z", geometry(ABU_DHABI))).toEqual([]);
  });
});

describe("trackView", () => {
  const g = geometry(MONZA);
  const view = trackView({
    geometry: g,
    rotationDeg: MONZA.circuit.rotation,
    marshalSectors: MONZA.circuit.marshalSectors,
    yellows: activeYellows(MONZA.raceControl, "2025-09-07T13:59:20Z"),
    positions: carPositions(MONZA.laps, "2025-09-07T13:09:00Z", g),
    focus: { a: 1, b: 4 },
    order: [81, 4, 16, 1],
  });

  it("draws the double-yellow marshal sector as its own stretch of track", () => {
    expect(view.yellows.map((y) => [y.sector, y.level])).toEqual([[7, "DOUBLE YELLOW"]]);
    expect(view.yellows[0]!.d.startsWith("M56.2,157.0L")).toBe(true);
  });

  it("places every running car, labels the top three plus A and B, and paints A last", () => {
    expect(view.cars).toHaveLength(19);
    expect(
      view.cars
        .filter((c) => c.labelled)
        .map((c) => c.number)
        .sort((a, b) => a - b),
    ).toEqual([1, 4, 16, 81]);
    expect(view.cars.slice(-2).map((c) => [c.number, c.role])).toEqual([
      [4, "B"],
      [1, "A"],
    ]);
  });

  it("keeps the circuit inside the 460 x 300 viewBox", () => {
    const xs = view.cars.map((c) => c.at[0]);
    const ys = view.cars.map((c) => c.at[1]);
    expect(Math.min(...xs) >= 0 && Math.max(...xs) <= 460 && Math.min(...ys) >= 0 && Math.max(...ys) <= 300).toBe(true);
    expect(view.sectors.map((s) => s.label)).toEqual(["S1", "S2", "S3"]);
    expect(view.drs).toHaveLength(2);
  });
});
