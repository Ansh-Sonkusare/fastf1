import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type F1ClientService, F1ClientServiceLive } from "../http/service";
import { getPitStops } from "./pitstops";

function run<A, E>(effect: Effect.Effect<A, E, F1ClientService>) {
  return Effect.runPromise(Effect.provide(effect, F1ClientServiceLive));
}

function mockFetch(body: unknown) {
  global.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  return global.fetch as ReturnType<typeof vi.fn>;
}

describe("getPitStops", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const response = {
    MRData: {
      RaceTable: {
        season: "2026",
        round: "1",
        Races: [
          {
            season: "2026",
            round: "1",
            raceName: "Bahrain Grand Prix",
            PitStops: [
              { driverId: "hamilton", lap: "18", stop: "1", time: "14:05:30", duration: "23.5" },
              { driverId: "leclerc", lap: "20", stop: "1", time: "14:08:12", duration: "22.9" },
              { driverId: "hamilton", lap: "37", stop: "2", time: "15:02:44", duration: "21.8" },
            ],
          },
        ],
      },
    },
  };

  it("should return all pit stops for a race", async () => {
    const fetchMock = mockFetch(response);

    const result = await run(getPitStops(2026, 1));

    expect(result).toHaveLength(3);
    expect(result[0].driverId).toBe("hamilton");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("should filter pit stops by driver", async () => {
    mockFetch(response);

    const result = await run(getPitStops(2026, 1, "hamilton"));

    expect(result).toHaveLength(2);
    expect(result.every((s) => s.driverId === "hamilton")).toBe(true);
  });

  it("should return empty array when no pit stops exist", async () => {
    mockFetch({
      MRData: {
        RaceTable: { season: "2026", round: "1", Races: [] },
      },
    });

    const result = await run(getPitStops(2026, 1));

    expect(result).toEqual([]);
  });

  it("should die on an invalid year", async () => {
    await expect(run(getPitStops(1899, 1))).rejects.toThrow("Invalid year");
  });
});
