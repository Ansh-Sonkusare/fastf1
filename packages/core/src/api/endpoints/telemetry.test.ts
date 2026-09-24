import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type F1ClientService, F1ClientServiceLive } from "../../http/service";
import { getCarData, getLocation } from "./telemetry";

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

describe("getCarData", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses car data and null-cleans nullable fields", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 1,
        date: "2024-03-01T12:00:00.000Z",
        speed: 320,
        rpm: 12500,
        n_gear: 6,
        throttle: 100,
        brake: 0,
        drs: 0,
      },
    ]);

    const result = await run(getCarData(9693));

    expect(result).toHaveLength(1);
    expect(result[0].session_key).toBe(9693);
    expect(result[0].driver_number).toBe(1);
    expect(result[0].speed).toBe(320);
    expect(result[0].rpm).toBe(12500);
    expect(result[0].n_gear).toBe(6);
    expect(result[0].throttle).toBe(100);
    expect(result[0].brake).toBe(0);
    expect(result[0].drs).toBe(0);
  });

  it("strips nulls from nullable fields", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 1,
        date: "2024-03-01T12:00:00.000Z",
        speed: null,
        rpm: null,
        n_gear: null,
        throttle: null,
        brake: null,
        drs: null,
      },
    ]);

    const result = await run(getCarData(9693));

    expect(result).toHaveLength(1);
    expect(collectNulls(result)).toEqual([]);
    expect(result[0].speed).toBeUndefined();
    expect(result[0].rpm).toBeUndefined();
    expect(result[0].n_gear).toBeUndefined();
    expect(result[0].throttle).toBeUndefined();
    expect(result[0].brake).toBeUndefined();
    expect(result[0].drs).toBeUndefined();
  });

  it("passes session_key as query param", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchSpy;

    await run(getCarData(9693));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("session_key=9693");
  });

  it("passes driver_number query param when provided", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchSpy;

    await run(getCarData(9693, 1));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("session_key=9693");
    expect(url).toContain("driver_number=1");
  });

  it("passes date range query params when provided", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchSpy;

    await run(
      getCarData(9693, undefined, {
        dateGt: "2024-03-01T08:00:00Z",
        dateLt: "2024-03-01T10:00:00Z",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledOnce();
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("session_key=9693");
    expect(url).toContain("date%3E=2024-03-01T08%3A00%3A00Z");
    expect(url).toContain("date%3C=2024-03-01T10%3A00%3A00Z");
  });

  testEdgeCases("getCarData", () => run(getCarData(9693)));
});

describe("getLocation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses location data with literal expected values", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 1,
        date: "2024-03-01T12:00:00.000Z",
        x: 124.5,
        y: 456.2,
        z: 50,
      },
    ]);

    const result = await run(getLocation(9693));

    expect(result).toHaveLength(1);
    expect(result[0].session_key).toBe(9693);
    expect(result[0].driver_number).toBe(1);
    expect(result[0].x).toBe(124.5);
    expect(result[0].y).toBe(456.2);
    expect(result[0].z).toBe(50);
  });

  it("strips nulls from nullable z coordinate", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 1,
        date: "2024-03-01T12:00:00.000Z",
        x: 124.5,
        y: 456.2,
        z: null,
      },
    ]);

    const result = await run(getLocation(9693));

    expect(result).toHaveLength(1);
    expect(collectNulls(result)).toEqual([]);
    expect(result[0].z).toBeUndefined();
  });

  it("passes session_key as query param", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchSpy;

    await run(getLocation(9693));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("session_key=9693");
  });

  it("passes driver_number query param when provided", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchSpy;

    await run(getLocation(9693, 1));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("session_key=9693");
    expect(url).toContain("driver_number=1");
  });

  testEdgeCases("getLocation", () => run(getLocation(9693)));
});
