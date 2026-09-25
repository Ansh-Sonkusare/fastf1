import { describe, it, expect } from "vitest";
import {
  shapeTyreStints,
  getCompoundColor,
  getCompoundAbbr,
  getUniqueCompounds,
} from "./tyreStrategy";
import { abuDhabiStints } from "./__fixtures__/stints";

const ABU_DHABI = 9839;

describe("shapeTyreStints (2025 Abu Dhabi GP, session 9839)", () => {
  const viewModels = shapeTyreStints(abuDhabiStints, ABU_DHABI);

  it("shapes every fetched stint (full grid, 47 rows)", () => {
    expect(viewModels).toHaveLength(47);
  });

  it("carries VER's real 2-stop strategy: MEDIUM 1-23, HARD 24-58", () => {
    const ver = viewModels.filter((s) => s.driverNumber === 1);
    expect(ver).toEqual([
      {
        driverNumber: 1,
        stintNumber: 1,
        compound: "MEDIUM",
        lapStart: 1,
        lapEnd: 23,
        duration: 23,
        tyreAgeAtStart: 0,
        estimatedAgeAtEnd: 22,
      },
      {
        driverNumber: 1,
        stintNumber: 2,
        compound: "HARD",
        lapStart: 24,
        lapEnd: 58,
        duration: 35,
        tyreAgeAtStart: 0,
        estimatedAgeAtEnd: 34,
      },
    ]);
  });

  it("carries NOR's real 3-stint strategy: MEDIUM, HARD, HARD", () => {
    const nor = viewModels.filter((s) => s.driverNumber === 4);
    expect(nor.map((s) => [s.compound, s.lapStart, s.lapEnd])).toEqual([
      ["MEDIUM", 1, 16],
      ["HARD", 17, 40],
      ["HARD", 41, 58],
    ]);
  });

  it("filters by session key", () => {
    expect(shapeTyreStints(abuDhabiStints, 999999)).toHaveLength(0);
  });

  it("sorts by driver then stint number", () => {
    for (let i = 1; i < viewModels.length; i++) {
      const prev = viewModels[i - 1];
      const curr = viewModels[i];
      if (prev.driverNumber === curr.driverNumber) {
        expect(prev.stintNumber).toBeLessThan(curr.stintNumber);
      } else {
        expect(prev.driverNumber).toBeLessThan(curr.driverNumber);
      }
    }
  });

  it("used only dry compounds in this race (SOFT/MEDIUM/HARD, no rain)", () => {
    expect(getUniqueCompounds(viewModels)).toEqual(["HARD", "MEDIUM", "SOFT"]);
  });
});

describe("Compound utilities", () => {
  it("returns the reference design's tyre compound colors", () => {
    expect(getCompoundColor("SOFT")).toBe("#ee4a3f");
    expect(getCompoundColor("MEDIUM")).toBe("#f2c230");
    expect(getCompoundColor("HARD")).toBe("#e8e8e3");
    expect(getCompoundColor("INTERMEDIATE")).toBe("#3fb56a");
  });

  it("returns default color for unknown compound", () => {
    expect(getCompoundColor("UNKNOWN")).toBe("#aeb5bf");
  });

  it("is case-insensitive", () => {
    expect(getCompoundColor("soft")).toBe("#ee4a3f");
    expect(getCompoundColor("Soft")).toBe("#ee4a3f");
  });

  it("returns correct abbreviation for each compound", () => {
    expect(getCompoundAbbr("SOFT")).toBe("S");
    expect(getCompoundAbbr("MEDIUM")).toBe("M");
    expect(getCompoundAbbr("HARD")).toBe("H");
    expect(getCompoundAbbr("INTERMEDIATE")).toBe("I");
    expect(getCompoundAbbr("WET")).toBe("W");
  });

  it("returns first letter for unknown compound", () => {
    expect(getCompoundAbbr("UNKNOWN")).toBe("U");
  });
});
