import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type F1ClientService, F1ClientServiceLive } from "../../http/service";
import { getIntervals, getSessionResult, getStartingGrid } from "./results";

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

function testEdgeCases(name: string, fn: (arg: unknown) => Promise<readonly unknown[]>) {
  it.each([
    ["empty array", []],
    ["non-array input", { error: "not found" }],
  ])("returns empty array for %s", async (_, input) => {
    mockFetch(input);
    const result = await fn(input);
    expect(result).toEqual([]);
  });
}

describe("getSessionResult", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses session result data with literal expected values", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 1,
        position: 1,
        duration: 5400.123,
        gap_to_leader: 0,
        number_of_laps: 57,
        dnf: false,
        dns: false,
        dsq: false,
      },
    ]);

    const result = await run(getSessionResult(9693));

    expect(result).toHaveLength(1);
    expect(result[0].session_key).toBe(9693);
    expect(result[0].driver_number).toBe(1);
    expect(result[0].position).toBe(1);
    expect(result[0].duration).toBe(5400.123);
    expect(result[0].gap_to_leader).toBe(0);
    expect(result[0].number_of_laps).toBe(57);
    expect(result[0].dnf).toBe(false);
    expect(result[0].dns).toBe(false);
    expect(result[0].dsq).toBe(false);
  });

  it("strips nulls from nullable fields", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 2,
        position: 2,
        duration: null,
        gap_to_leader: null,
        number_of_laps: 56,
        dnf: false,
        dns: false,
        dsq: false,
      },
    ]);

    const result = await run(getSessionResult(9693));

    expect(result).toHaveLength(1);
    expect(collectNulls(result)).toEqual([]);
    expect(result[0].duration).toBeUndefined();
    expect(result[0].gap_to_leader).toBeUndefined();
  });

  it("handles DNF (Did Not Finish) entry", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 55,
        position: 20,
        duration: null,
        gap_to_leader: null,
        number_of_laps: 30,
        dnf: true,
        dns: false,
        dsq: false,
      },
    ]);

    const result = await run(getSessionResult(9693));

    expect(result).toHaveLength(1);
    expect(result[0].dnf).toBe(true);
    expect(result[0].dns).toBe(false);
    expect(result[0].dsq).toBe(false);
  });

  it("passes session_key query param", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchSpy;

    await run(getSessionResult(9693));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("session_key=9693");
  });

  testEdgeCases("getSessionResult", () => run(getSessionResult(9693)));
});

describe("getStartingGrid", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses starting grid data with literal expected values", async () => {
    mockFetch([
      {
        session_key: 9698,
        meeting_key: 1254,
        driver_number: 1,
        position: 1,
        lap_duration: 95.123,
      },
    ]);

    const result = await run(getStartingGrid(9698));

    expect(result).toHaveLength(1);
    expect(result[0].session_key).toBe(9698);
    expect(result[0].driver_number).toBe(1);
    expect(result[0].position).toBe(1);
    expect(result[0].lap_duration).toBe(95.123);
  });

  it("strips nulls from nullable lap_duration", async () => {
    mockFetch([
      {
        session_key: 9698,
        meeting_key: 1254,
        driver_number: 2,
        position: 2,
        lap_duration: null,
      },
    ]);

    const result = await run(getStartingGrid(9698));

    expect(result).toHaveLength(1);
    expect(collectNulls(result)).toEqual([]);
    expect(result[0].lap_duration).toBeUndefined();
  });

  it("handles multiple grid positions", async () => {
    mockFetch([
      {
        session_key: 9698,
        meeting_key: 1254,
        driver_number: 1,
        position: 1,
        lap_duration: 95.123,
      },
      {
        session_key: 9698,
        meeting_key: 1254,
        driver_number: 44,
        position: 2,
        lap_duration: 95.456,
      },
      {
        session_key: 9698,
        meeting_key: 1254,
        driver_number: 55,
        position: 3,
        lap_duration: 95.789,
      },
    ]);

    const result = await run(getStartingGrid(9698));

    expect(result).toHaveLength(3);
    expect(result[0].position).toBe(1);
    expect(result[1].position).toBe(2);
    expect(result[2].position).toBe(3);
  });

  it("passes session_key query param", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchSpy;

    await run(getStartingGrid(9698));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("session_key=9698");
  });

  testEdgeCases("getStartingGrid", () => run(getStartingGrid(9698)));
});

describe("getIntervals", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses interval data with literal expected values", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 1,
        date: "2024-03-01T12:30:00Z",
        gap_to_leader: 0,
        interval: 0,
      },
    ]);

    const result = await run(getIntervals(9693));

    expect(result).toHaveLength(1);
    expect(result[0].session_key).toBe(9693);
    expect(result[0].driver_number).toBe(1);
    expect(result[0].gap_to_leader).toBe(0);
    expect(result[0].interval).toBe(0);
  });

  it("strips nulls from nullable fields", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 2,
        date: "2024-03-01T12:30:00Z",
        gap_to_leader: null,
        interval: null,
      },
    ]);

    const result = await run(getIntervals(9693));

    expect(result).toHaveLength(1);
    expect(collectNulls(result)).toEqual([]);
    expect(result[0].gap_to_leader).toBeUndefined();
    expect(result[0].interval).toBeUndefined();
  });

  it("handles multiple driver intervals with gaps", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 1,
        date: "2024-03-01T12:30:00Z",
        gap_to_leader: 0,
        interval: 0,
      },
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 44,
        date: "2024-03-01T12:30:00Z",
        gap_to_leader: 2.5,
        interval: 2.5,
      },
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 55,
        date: "2024-03-01T12:30:00Z",
        gap_to_leader: 5.1,
        interval: 2.6,
      },
    ]);

    const result = await run(getIntervals(9693));

    expect(result).toHaveLength(3);
    expect(result[0].gap_to_leader).toBe(0);
    expect(result[1].gap_to_leader).toBe(2.5);
    expect(result[1].interval).toBe(2.5);
    expect(result[2].gap_to_leader).toBe(5.1);
    expect(result[2].interval).toBe(2.6);
  });

  it("passes session_key query param", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchSpy;

    await run(getIntervals(9693));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("session_key=9693");
  });

  testEdgeCases("getIntervals", () => run(getIntervals(9693)));
});
