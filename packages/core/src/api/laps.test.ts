import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLaps } from "./laps";

global.fetch = vi.fn();

describe("getLaps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return lap data for valid year and round", async () => {
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
              Laps: [
                {
                  number: "1",
                  Timings: [
                    {
                      driverId: "hamilton",
                      position: "1",
                      time: "1:45.123",
                    },
                  ],
                },
                {
                  number: "2",
                  Timings: [
                    {
                      driverId: "hamilton",
                      position: "1",
                      time: "1:44.456",
                    },
                  ],
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

    const result = await getLaps(2024, 1);

    expect(result).toHaveLength(2);
    expect(result[0].number).toBe("1");
    expect(result[0].Timings[0].driverId).toBe("hamilton");
  });

  it("should filter by driverId when provided", async () => {
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
              Laps: [
                {
                  number: "1",
                  Timings: [
                    {
                      driverId: "hamilton",
                      position: "1",
                      time: "1:45.123",
                    },
                    {
                      driverId: "verstappen",
                      position: "2",
                      time: "1:45.456",
                    },
                  ],
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

    const result = await getLaps(2024, 1, "hamilton");

    expect(result).toHaveLength(1);
    expect(result[0].Timings[0].driverId).toBe("hamilton");
  });

  it("should throw on invalid year", async () => {
    await expect(getLaps(1800, 1)).rejects.toThrow();
  });
});
