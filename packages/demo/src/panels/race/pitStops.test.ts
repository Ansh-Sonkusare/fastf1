import { describe, it, expect } from "vitest";
import { shapePitStops, getMaxPitDuration } from "./pitStops";
import { abuDhabiPits } from "./__fixtures__/pits";

describe("PitStops shaping", () => {
  it("shapes pit stop data into view models", () => {
    const viewModels = shapePitStops(abuDhabiPits, 9999);

    expect(viewModels).toHaveLength(4);
    expect(viewModels[0].driverNumber).toBe(1);
    expect(viewModels[0].lapNumber).toBe(6);
    expect(viewModels[0].stationaryDuration).toBe(12.222);
    expect(viewModels[0].laneDuration).toBe(12.345);
    expect(viewModels[0].totalDuration).toBe(24.567);
  });

  it("ranks pit stops by lap number", () => {
    const viewModels = shapePitStops(abuDhabiPits, 9999);

    // Should be sorted by lap number
    expect(viewModels[0].lapNumber).toBeLessThanOrEqual(
      viewModels[1].lapNumber
    );
    expect(viewModels[1].lapNumber).toBeLessThanOrEqual(
      viewModels[2].lapNumber
    );
  });

  it("filters by session key", () => {
    const viewModels = shapePitStops(abuDhabiPits, 999999); // wrong session

    expect(viewModels).toHaveLength(0);
  });

  it("filters out pits with no lap number", () => {
    const pitWithoutLap = {
      ...abuDhabiPits[0],
      lap_number: null,
    };

    const viewModels = shapePitStops([pitWithoutLap], 9999);

    expect(viewModels).toHaveLength(0);
  });

  it("calculates max pit duration correctly", () => {
    const viewModels = shapePitStops(abuDhabiPits, 9999);
    const max = getMaxPitDuration(viewModels);

    // Max should be 25.123 from Hamilton's first stop
    expect(max).toBe(25.123);
  });

  it("handles empty pit list", () => {
    const max = getMaxPitDuration([]);

    expect(max).toBe(30); // default
  });
});
