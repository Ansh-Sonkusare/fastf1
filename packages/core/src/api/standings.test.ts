import { beforeEach, describe, expect, it, vi } from "vitest";
import { getConstructorStandings, getDriverStandings } from "./standings";

global.fetch = vi.fn();

describe("getDriverStandings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return driver standings for valid year", async () => {
    const mockResponse = {
      MRData: {
        StandingsTable: {
          season: "2024",
          StandingsLists: [
            {
              season: "2024",
              round: "10",
              DriverStandings: [
                {
                  position: "1",
                  positionText: "1",
                  points: "200",
                  wins: "5",
                  Driver: {
                    driverId: "hamilton",
                    code: "HAM",
                    firstName: "Lewis",
                    lastName: "Hamilton",
                    nationality: "British",
                    dateOfBirth: "1985-01-07",
                  },
                  Constructors: [
                    {
                      constructorId: "mercedes",
                      name: "Mercedes",
                      nationality: "German",
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

    const result = await getDriverStandings(2024);

    expect(result).toHaveLength(1);
    expect(result[0].Driver.driverId).toBe("hamilton");
    expect(result[0].points).toBe("200");
  });

  it("should throw on invalid year", async () => {
    await expect(getDriverStandings(1800)).rejects.toThrow();
  });
});

describe("getConstructorStandings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return constructor standings for valid year", async () => {
    const mockResponse = {
      MRData: {
        StandingsTable: {
          season: "2024",
          StandingsLists: [
            {
              season: "2024",
              round: "10",
              ConstructorStandings: [
                {
                  position: "1",
                  positionText: "1",
                  points: "350",
                  wins: "7",
                  Constructor: {
                    constructorId: "red_bull",
                    name: "Red Bull",
                    nationality: "Austrian",
                  },
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

    const result = await getConstructorStandings(2024);

    expect(result).toHaveLength(1);
    expect(result[0].Constructor.name).toBe("Red Bull");
    expect(result[0].points).toBe("350");
  });

  it("should throw on invalid year", async () => {
    await expect(getConstructorStandings(1800)).rejects.toThrow();
  });
});
