import { describe, expect, it } from "vitest";
import { abuRace } from "./__fixtures__/races";
import { fitDegradation } from "./fit";

describe("fitDegradation", () => {
  it("fits MEDIUM and HARD wear from Abu Dhabi clean laps and keeps SOFT on its prior", () => {
    const { fits } = fitDegradation(abuRace, 40);
    expect(fits.MEDIUM?.slope.value).toBeCloseTo(0.062, 3);
    expect(fits.MEDIUM?.slope.sd).toBeCloseTo(0.009, 3);
    expect(fits.MEDIUM?.cleanLaps).toBe(91);
    expect(fits.HARD?.slope.value).toBeCloseTo(0.049, 3);
    expect(fits.HARD?.slope.sd).toBeCloseTo(0.003, 3);
    expect(fits.HARD?.cleanLaps).toBe(300);
    expect(fits.SOFT?.prior).toBe(true);
    expect(fits.HARD?.prior).toBe(false);
  });
});
