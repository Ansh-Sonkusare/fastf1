import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSchedule } from "./schedule";

global.fetch = vi.fn();

describe("getSchedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return schedule data for valid year", async () => {
    const mockResponse = {
      MRData: {
        RaceTable: {
          season: "2024",
          Races: [
            {
              season: "2024",
              round: "1",
              url: "http://example.com",
              raceName: "Bahrain Grand Prix",
              Circuit: {
                circuitId: "bahrain",
                url: "http://example.com/circuit",
                circuitName: "Bahrain International Circuit",
                Location: {
                  lat: "26.0325",
                  long: "50.5106",
                  locality: "Sakhir",
                  country: "Bahrain",
                },
              },
              date: "2024-03-02",
              time: "15:00:00Z",
            },
          ],
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await getSchedule(2024);

    expect(result.Races).toHaveLength(1);
    expect(result.season).toBe("2024");
    expect(result.Races[0].raceName).toBe("Bahrain Grand Prix");
  });

  it("should throw on invalid year", async () => {
    await expect(getSchedule(1800)).rejects.toThrow();
  });
});
