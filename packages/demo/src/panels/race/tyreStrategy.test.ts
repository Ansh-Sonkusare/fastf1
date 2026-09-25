import { describe, it, expect } from "vitest";
import {
  shapeTyreStints,
  getCompoundColor,
  getCompoundAbbr,
  getUniqueCompounds,
} from "./tyreStrategy";
import { abuDhabiStints } from "./__fixtures__/stints";

describe("TyreStrategy shaping", () => {
  it("shapes stint data into view models", () => {
    const viewModels = shapeTyreStints(abuDhabiStints, 9999);

    expect(viewModels).toHaveLength(6); // 3 stints x 2 drivers
    expect(viewModels[0].driverNumber).toBe(1);
    expect(viewModels[0].stintNumber).toBe(1);
    expect(viewModels[0].compound).toBe("SOFT");
    expect(viewModels[0].lapStart).toBe(1);
    expect(viewModels[0].lapEnd).toBe(6);
  });

  it("calculates stint duration (lap count)", () => {
    const viewModels = shapeTyreStints(abuDhabiStints, 9999);

    // First stint: lap 1-6 = 6 laps
    expect(viewModels[0].duration).toBe(6);
    // Second stint: lap 7-27 = 21 laps
    expect(viewModels[1].duration).toBe(21);
  });

  it("calculates estimated tyre age at end of stint", () => {
    const viewModels = shapeTyreStints(abuDhabiStints, 9999);

    // First stint: ageAtStart=0, duration=6, so ageAtEnd=6
    expect(viewModels[0].estimatedAgeAtEnd).toBe(6);
    // Second stint: ageAtStart=0, duration=21, so ageAtEnd=21
    expect(viewModels[1].estimatedAgeAtEnd).toBe(21);
  });

  it("filters by session key", () => {
    const viewModels = shapeTyreStints(abuDhabiStints, 999999); // wrong session

    expect(viewModels).toHaveLength(0);
  });

  it("sorts by driver then stint number", () => {
    const viewModels = shapeTyreStints(abuDhabiStints, 9999);

    expect(viewModels[0].driverNumber).toBeLessThanOrEqual(
      viewModels[1].driverNumber
    );
    expect(viewModels[2].driverNumber).toBeLessThanOrEqual(
      viewModels[3].driverNumber
    );
  });
});

describe("Compound utilities", () => {
  it("returns correct color for each compound", () => {
    expect(getCompoundColor("SOFT")).toBe("#ff5a4f");
    expect(getCompoundColor("MEDIUM")).toBe("#e6c229");
    expect(getCompoundColor("HARD")).toBe("#f5f5f5");
    expect(getCompoundColor("INTERMEDIATE")).toBe("#3ecf6e");
    expect(getCompoundColor("WET")).toBe("#6fd3e8");
  });

  it("returns default color for unknown compound", () => {
    expect(getCompoundColor("UNKNOWN")).toBe("#aeb5bf");
  });

  it("is case-insensitive", () => {
    expect(getCompoundColor("soft")).toBe("#ff5a4f");
    expect(getCompoundColor("Soft")).toBe("#ff5a4f");
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

  it("gets unique compounds from stints", () => {
    const viewModels = shapeTyreStints(abuDhabiStints, 9999);
    const compounds = getUniqueCompounds(viewModels);

    expect(compounds).toContain("SOFT");
    expect(compounds).toContain("MEDIUM");
    expect(compounds).toContain("HARD");
    expect(compounds).toHaveLength(3);
  });
});
