import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type F1ClientService, F1ClientServiceLive } from "../http/service";
import { getRaceResults } from "./results";

function run<A, E>(effect: Effect.Effect<A, E, F1ClientService>) {
  return Effect.runPromise(Effect.provide(effect, F1ClientServiceLive));
}

describe("getRaceResults", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return race results for valid year and round", async () => {
    const mockResponse = {
      MRData: {
        RaceTable: {
          season: "2026",
          round: "1",
          Races: [
            {
              season: "2026",
              round: "1",
              raceName: "Bahrain Grand Prix",
              date: "2026-04-05",
              Results: [
                {
                  number: "1",
                  position: "1",
                  positionText: "1",
                  points: "25",
                  Driver: {
                    driverId: "hamilton",
                    code: "HAM",
                    givenName: "Lewis",
                    familyName: "Hamilton",
                    nationality: "British",
                  },
                  Constructor: {
                    constructorId: "mercedes",
                    name: "Mercedes",
                    nationality: "German",
                  },
                  grid: "1",
                  laps: "57",
                  status: "Finished",
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

    const result = await run(getRaceResults(2026, 1));
    const firstRace = result[0];

    expect(result).toBeDefined();
    expect(result).toHaveLength(1);
    expect(firstRace).toBeDefined();
    expect(firstRace?.Results).toHaveLength(1);
    expect(firstRace?.Results?.[0]?.Driver?.driverId).toBe("hamilton");
  });

  it("should return qualifying results when type is 'qualifying'", async () => {
    const mockResponse = {
      MRData: {
        RaceTable: {
          season: "2026",
          round: "1",
          Races: [
            {
              season: "2026",
              round: "1",
              raceName: "Bahrain Grand Prix",
              date: "2026-04-05",
              QualifyingResults: [
                {
                  number: "1",
                  position: "1",
                  Driver: {
                    driverId: "hamilton",
                    code: "HAM",
                    givenName: "Lewis",
                    familyName: "Hamilton",
                  },
                  Constructor: {
                    constructorId: "mercedes",
                    name: "Mercedes",
                  },
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

    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await run(getRaceResults(2026, 1, "qualifying"));

    expect(result[0].QualifyingResults).toBeDefined();
    expect(result[0].QualifyingResults?.[0].Driver?.driverId).toBe("hamilton");
  });

  it("should throw on invalid year", async () => {
    await expect(run(getRaceResults(1800, 1))).rejects.toThrow();
  });
});
