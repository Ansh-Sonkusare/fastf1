import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type F1ClientService, F1ClientServiceLive } from "../http/service";
import { getSchedule } from "./schedule";

function run<A, E>(effect: Effect.Effect<A, E, F1ClientService>) {
  return Effect.runPromise(Effect.provide(effect, F1ClientServiceLive));
}

describe("getSchedule", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return schedule data for valid year", async () => {
    const mockResponse = {
      MRData: {
        xmlns: "",
        series: "f1",
        url: "https://api.jolpi.ca/ergast/f1/2026.json",
        limit: "30",
        offset: "0",
        total: "24",
        RaceTable: {
          season: "2026",
          Races: [
            {
              season: "2026",
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
              date: "2026-04-05",
              time: "15:00:00Z",
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

    const result = await run(getSchedule(2026));

    expect(result.Races).toHaveLength(1);
    expect(result.season).toBe("2026");
    expect(result.Races[0].raceName).toBe("Bahrain Grand Prix");
  });

  it("should throw on invalid year", async () => {
    await expect(run(getSchedule(1800))).rejects.toThrow();
  });
});
