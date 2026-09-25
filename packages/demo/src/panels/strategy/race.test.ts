import { describe, expect, it } from "vitest";
import abu from "./__fixtures__/abu-dhabi-2025.json";
import monza from "./__fixtures__/monza-2025.json";
import { parseRace, standingsAt } from "./race";
import type { RaceDriver } from "./types";

const abuRace = parseRace(abu);
const monzaRace = parseRace(monza);
const driver = (code: string, drivers: readonly RaceDriver[] = abuRace.drivers) =>
  drivers.find((d) => d.code === code) as RaceDriver;
const tyre = (d: RaceDriver, lap: number) => {
  const { compound, tyreAge, stint, pitIn, pitOut } = d.laps[lap - 1];
  return { compound, tyreAge, stint, pitIn, pitOut };
};

describe("parseRace", () => {
  it("takes the race distance from the lap rows", () => {
    expect(abuRace.totalLaps).toBe(58);
    expect(monzaRace.totalLaps).toBe(53);
  });

  it("tracks compound, tyre age and pit laps through a stop", () => {
    const ver = driver("VER");
    expect(tyre(ver, 23)).toEqual({
      compound: "MEDIUM",
      tyreAge: 23,
      stint: 1,
      pitIn: true,
      pitOut: false,
    });
    expect(tyre(ver, 24)).toEqual({
      compound: "HARD",
      tyreAge: 1,
      stint: 2,
      pitIn: false,
      pitOut: true,
    });
  });

  it("counts a used set from its recorded age", () => {
    expect(tyre(driver("ALO"), 17)).toEqual({
      compound: "HARD",
      tyreAge: 2,
      stint: 2,
      pitIn: false,
      pitOut: true,
    });
  });

  it("ends a retired car at its last completed lap and drops a car that never completed one", () => {
    expect(driver("ALO", monzaRace.drivers).laps).toHaveLength(24);
    expect(monzaRace.drivers.map((d) => d.code)).not.toContain("HUL");
    expect(monzaRace.drivers).toHaveLength(19);
  });

  it("finds no neutral laps in either race, and flags a lap the whole field ran slowly", () => {
    expect([...abuRace.neutralLaps]).toEqual([]);
    expect([...monzaRace.neutralLaps]).toEqual([]);
    const slowed = parseRace({
      ...abu,
      laps: abu.laps.map((l) =>
        l.lap_number === 30 ? { ...l, lap_duration: l.lap_duration * 1.4 } : l,
      ),
    });
    expect([...slowed.neutralLaps]).toEqual([30]);
  });

  it("keeps team colours as hex", () => {
    expect(driver("VER").color).toBe("#4781D7");
  });
});

describe("standingsAt", () => {
  it("orders the flag by line crossing with gaps to the winner", () => {
    const top = standingsAt(abuRace, 58).slice(0, 3);
    expect(top.map((s) => [s.driver.code, s.position])).toEqual([
      ["VER", 1],
      ["PIA", 2],
      ["NOR", 3],
    ]);
    expect(top[1].gapToLeader).toBeCloseTo(12.548, 3);
    expect(top[2].gapToLeader).toBeCloseTo(16.551, 3);
  });

  it("leaves out cars that had retired", () => {
    const codes = standingsAt(monzaRace, 30).map((s) => s.driver.code);
    expect(codes).toHaveLength(18);
    expect(codes).not.toContain("ALO");
    expect(standingsAt(monzaRace, 24).map((s) => s.driver.code)).toContain("ALO");
  });
});
