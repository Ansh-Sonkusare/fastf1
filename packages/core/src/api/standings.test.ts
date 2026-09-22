import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type F1ClientService, F1ClientServiceLive } from "../http/service";
import { getConstructorStandings, getDriverStandings } from "./standings";

function run<A, E>(effect: Effect.Effect<A, E, F1ClientService>) {
  return Effect.runPromise(Effect.provide(effect, F1ClientServiceLive));
}

describe("getDriverStandings", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return driver standings for valid year", async () => {
    const mockResponse = {
      MRData: {
        StandingsTable: {
          season: "2026",
          StandingsLists: [
            {
              season: "2026",
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
                    givenName: "Lewis",
                    familyName: "Hamilton",
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

    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await run(getDriverStandings(2026));

    expect(result).toHaveLength(1);
    expect(result[0].Driver.driverId).toBe("hamilton");
    expect(result[0].points).toBe("200");
  });

  it("should throw on invalid year", async () => {
    await expect(run(getDriverStandings(1800))).rejects.toThrow();
  });
});

describe("getConstructorStandings", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return constructor standings for valid year", async () => {
    const mockResponse = {
      MRData: {
        StandingsTable: {
          season: "2026",
          StandingsLists: [
            {
              season: "2026",
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

    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await run(getConstructorStandings(2026));

    expect(result).toHaveLength(1);
    expect(result[0].Constructor.name).toBe("Red Bull");
    expect(result[0].points).toBe("350");
  });

  it("should throw on invalid year", async () => {
    await expect(run(getConstructorStandings(1800))).rejects.toThrow();
  });
});
