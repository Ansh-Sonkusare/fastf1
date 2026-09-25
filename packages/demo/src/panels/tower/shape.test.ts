import { describe, expect, it } from "vitest";
import { lapCrossings } from "../../app/timeline";
import { laps, pits, stints } from "../../app/__fixtures__/race";
import { buildTower } from "./shape";

const crossings = lapCrossings(laps);
const tower = (lap: number) => buildTower({ lap, crossings, laps, stints, pits });

describe("buildTower", () => {
  it("orders by laps done then completion time, with gaps and intervals", () => {
    expect(tower(1).map((r) => [r.driver, r.gap, r.interval])).toEqual([
      [1, "LEADER", null],
      [81, "+1.000", 1],
      [4, "+1.500", 0.5],
      [27, "+1 L", null],
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

describe("buildTower lapped finishers", () => {
  it("a car a lap down at the flag is lapped, not out", () => {
    const withLapped = [...laps, { ...laps[9]!, lap_number: 2, date_start: "2025-12-07T13:05:50.000Z", lap_duration: 100 }];
    const rows = buildTower({ lap: 3, crossings: lapCrossings(withLapped), laps: withLapped, stints, pits });
    expect(rows.at(-1)).toMatchObject({ driver: 27, gap: "+1 L" });
  });
});
