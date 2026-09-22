import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type F1ClientService, F1ClientServiceLive } from "../../http/service";
import { getOpenF1Laps, getPitStops, getPosition, getStints } from "./laps";

function run<A, E>(effect: Effect.Effect<A, E, F1ClientService>) {
  return Effect.runPromise(Effect.provide(effect, F1ClientServiceLive));
}

function mockFetch(data: unknown) {
  global.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function collectNulls(items: readonly object[]): string[] {
  const keys = new Set<string>();
  for (const item of items) {
    for (const [key, value] of Object.entries(item)) {
      if (value === null) keys.add(key);
    }
  }
  return [...keys];
}

describe("getOpenF1Laps", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses lap data and null-cleans nullable fields", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 1,
        lap_number: 1,
        lap_duration: 98.123,
        is_pit_out_lap: null,
        segments_sector_1: [1, null, 2],
      },
    ]);

    const result = await run(getOpenF1Laps(9693));

    expect(result).toHaveLength(1);
    expect(result[0].lap_number).toBe(1);
    expect(result[0].lap_duration).toBe(98.123);
    expect(result[0].is_pit_out_lap).toBeUndefined();
    expect(result[0].segments_sector_1).toEqual([1, null, 2]);
  });

  it("strips nulls from nullable fields in the projected output", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 1,
        lap_number: 1,
        date_start: null,
        lap_duration: null,
        duration_sector_1: null,
        i1_speed: null,
        is_pit_out_lap: null,
      },
    ]);

    const result = await run(getOpenF1Laps(9693));

    expect(result).toHaveLength(1);
    expect(collectNulls(result)).toEqual([]);
    expect(result[0].is_pit_out_lap).toBeUndefined();
  });

  it("passes driver and lap query params", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchSpy;

    await run(getOpenF1Laps(9693, 1, 5));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("session_key=9693");
    expect(url).toContain("driver_number=1");
    expect(url).toContain("lap_number=5");
  });

  it("returns an empty array for empty array input", async () => {
    mockFetch([]);

    const result = await run(getOpenF1Laps(9693));

    expect(result).toEqual([]);
  });

  it("returns an empty array for non-array input", async () => {
    mockFetch({ error: "not found" });

    const result = await run(getOpenF1Laps(9693));

    expect(result).toEqual([]);
  });
});

describe("openf1 stints, pit stops and positions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses stints with nullable tyre age projected away", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 1,
        stint_number: 1,
        lap_start: 1,
        lap_end: 20,
        compound: "MEDIUM",
        tyre_age_at_start: null,
      },
    ]);

    const result = await run(getStints(9693));

    expect(result).toHaveLength(1);
    expect(result[0].compound).toBe("MEDIUM");
    expect(result[0].tyre_age_at_start).toBeUndefined();
  });

  it("parses pit stops and positions", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 1,
        lap_number: 20,
        stop_number: 2,
        pit_duration: 25.4,
        lane_duration: null,
      },
    ]);
    const pits = await run(getPitStops(9693));

    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 1,
        position: 3,
        date: "2026-03-01T12:00:00Z",
      },
    ]);
    const positions = await run(getPosition(9693));

    expect(pits).toHaveLength(1);
    expect(pits[0].pit_duration).toBe(25.4);
    expect(pits[0].lane_duration).toBeUndefined();
    expect(positions).toHaveLength(1);
    expect(positions[0].position).toBe(3);
  });
});
