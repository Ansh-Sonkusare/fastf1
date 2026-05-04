import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRaceResults } from "./results";

global.fetch = vi.fn();

describe("getRaceResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return race results for valid year and round", async () => {
    const mockResponse = {
      MRData: {
        RaceTable: {
          season: "2024",
          round: "1",
          Races: [
            {
              season: "2024",
              round: "1",
              raceName: "Bahrain Grand Prix",
              date: "2024-03-02",
              Results: [
                {
                  driverId: "hamilton",
                  constructorId: "mercedes",
                  position: "1",
                  positionText: "1",
                  points: "25",
                  laps: "57",
                  grid: "1",
                  status: "Finished",
                },
              ],
            },
          ],
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await getRaceResults(2024, 1);

    expect(result).toBeDefined();
    expect(result[0].Results[0].driverId).toBe("hamilton");
  });

  it("should return qualifying results when type is 'qualifying'", async () => {
    const mockResponse = {
      MRData: {
        RaceTable: {
          season: "2024",
          round: "1",
          Races: [
            {
              season: "2024",
              round: "1",
              raceName: "Bahrain Grand Prix",
              date: "2024-03-02",
              QualifyingResults: [
                {
                  driverId: "hamilton",
                  constructorId: "mercedes",
                  position: "1",
                  q1: "1:30.123",
                  q2: "1:29.456",
                  q3: "1:28.789",
                },
              ],
            },
          ],
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await getRaceResults(2024, 1, "qualifying");

    expect(result[0].QualifyingResults).toBeDefined();
    expect(result[0].QualifyingResults?.[0].driverId).toBe("hamilton");
  });

  it("should throw on invalid year", async () => {
    await expect(getRaceResults(1800, 1)).rejects.toThrow();
  });
});
