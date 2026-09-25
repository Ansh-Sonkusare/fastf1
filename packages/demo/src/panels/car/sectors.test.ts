import { describe, expect, it } from "vitest";
import { ABU_DHABI, MONZA } from "./__fixtures__";
import { runningOrder } from "./order";
import { type MiniMark, sectorGrid } from "./sectors";

const LETTER: Record<MiniMark, string> = {
  overall: "o",
  personal: "p",
  slower: "s",
  pit: "i",
  none: "n",
};
const minis = (row: { minis: readonly (readonly MiniMark[])[] }) => row.minis.map((m) => m.map((x) => LETTER[x]).join("")).join("|");

describe("sectorGrid", () => {
  const abu = sectorGrid(ABU_DHABI.laps, 5, runningOrder(ABU_DHABI.laps, 5));

  it("marks sector times overall, personal or slower against bests up to the lap", () => {
    expect(abu.slice(0, 3).map((r) => [r.driver, r.sectors.map((s) => `${s.seconds} ${s.mark}`)])).toEqual([
      [1, ["18.142 slower", "38.529 slower", "33.024 slower"]],
      [81, ["18.242 slower", "38.434 slower", "33.082 slower"]],
      [4, ["17.917 overall", "38.762 slower", "33.139 personal"]],
    ]);
  });

  it("maps timing-feed mini-sector codes, one group per sector", () => {
    expect(abu.slice(0, 3).map(minis)).toEqual(["nssss|ssspsssss|ssssssssss", "nssps|psssspsss|ssssssspss", "spsps|ssspsssss|spsspsspss"]);
  });

  it("flags the fastest speed trap in each column, ties included", () => {
    const fastest = abu.filter((r) => r.traps.st.fastest).map((r) => [r.driver, r.traps.st.kmh]);
    expect(fastest).toEqual([
      [23, 327],
      [12, 327],
    ]);
  });

  it("shows an empty row for a driver without the lap", () => {
    const [row] = sectorGrid(MONZA.laps, 10, [16]);
    expect(row!.sectors.map((s) => s.mark)).toEqual(["none", "none", "none"]);
    expect(row!.traps.st).toEqual({ kmh: null, fastest: false });
  });

  it("colours Monza lap 5 with Verstappen's overall-best S2", () => {
    const [ver] = sectorGrid(MONZA.laps, 5, [1]);
    expect(ver!.sectors.map((s) => s.mark)).toEqual(["slower", "overall", "slower"]);
    expect(minis(ver!)).toBe("sssoss|sosssss|sssssssss");
  });
});
