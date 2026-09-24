import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type F1ClientService, F1ClientServiceLive } from "../../http/service";
import { getWeather, getRaceControl, getTeamRadio, getOvertakes } from "./context";

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

describe("getWeather", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses weather data and null-cleans nullable fields", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        date: "2024-03-01T12:00:00Z",
        air_temperature: 25.5,
        track_temperature: 45.0,
        humidity: 65,
        pressure: 1013.25,
        wind_speed: 12.5,
        wind_direction: 270,
        precipitation: 0,
        track_surface_temperature: 50.2,
      },
    ]);

    const result = await run(getWeather(9693));

    expect(result).toHaveLength(1);
    expect(result[0].session_key).toBe(9693);
    expect(result[0].air_temperature).toBe(25.5);
    expect(result[0].track_temperature).toBe(45.0);
    expect(result[0].humidity).toBe(65);
    expect(result[0].pressure).toBe(1013.25);
    expect(result[0].wind_speed).toBe(12.5);
    expect(result[0].wind_direction).toBe(270);
    expect(result[0].precipitation).toBe(0);
    expect(result[0].track_surface_temperature).toBe(50.2);
  });

  it("strips nulls from all nullable fields", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        date: "2024-03-01T12:00:00Z",
        air_temperature: null,
        track_temperature: null,
        humidity: null,
        pressure: null,
        wind_speed: null,
        wind_direction: null,
        precipitation: null,
        track_surface_temperature: null,
      },
    ]);

    const result = await run(getWeather(9693));

    expect(result).toHaveLength(1);
    expect(collectNulls(result)).toEqual([]);
    expect(result[0].air_temperature).toBeUndefined();
    expect(result[0].track_temperature).toBeUndefined();
    expect(result[0].humidity).toBeUndefined();
    expect(result[0].pressure).toBeUndefined();
    expect(result[0].wind_speed).toBeUndefined();
    expect(result[0].wind_direction).toBeUndefined();
    expect(result[0].precipitation).toBeUndefined();
    expect(result[0].track_surface_temperature).toBeUndefined();
  });

  it("passes session_key query param", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchSpy;

    await run(getWeather(9693));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("session_key=9693");
  });

  it("returns an empty array for empty array input", async () => {
    mockFetch([]);

    const result = await run(getWeather(9693));

    expect(result).toEqual([]);
  });

  it("returns an empty array for non-array input", async () => {
    mockFetch({ error: "not found" });

    const result = await run(getWeather(9693));

    expect(result).toEqual([]);
  });
});

describe("getRaceControl", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses race control data and null-cleans nullable fields", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        date: "2024-03-01T12:05:00Z",
        category: "Yellow Flag",
        flag: "YELLOW",
        scope: "Track",
        sector: 2,
        lap_number: 10,
        driver_number: 1,
        message: "Yellow flag for accident at turn 5",
        qualifying_phase: null,
      },
    ]);

    const result = await run(getRaceControl(9693));

    expect(result).toHaveLength(1);
    expect(result[0].session_key).toBe(9693);
    expect(result[0].category).toBe("Yellow Flag");
    expect(result[0].flag).toBe("YELLOW");
    expect(result[0].scope).toBe("Track");
    expect(result[0].sector).toBe(2);
    expect(result[0].lap_number).toBe(10);
    expect(result[0].driver_number).toBe(1);
    expect(result[0].message).toBe("Yellow flag for accident at turn 5");
    expect(result[0].qualifying_phase).toBeUndefined();
  });

  it("strips nulls from nullable fields", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        date: "2024-03-01T12:05:00Z",
        category: "Track Limits",
        flag: null,
        scope: null,
        sector: null,
        lap_number: null,
        driver_number: null,
        message: "Track limits message",
        qualifying_phase: null,
      },
    ]);

    const result = await run(getRaceControl(9693));

    expect(result).toHaveLength(1);
    expect(collectNulls(result)).toEqual([]);
    expect(result[0].flag).toBeUndefined();
    expect(result[0].scope).toBeUndefined();
    expect(result[0].sector).toBeUndefined();
    expect(result[0].lap_number).toBeUndefined();
    expect(result[0].driver_number).toBeUndefined();
    expect(result[0].qualifying_phase).toBeUndefined();
  });

  it("passes session_key query param", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchSpy;

    await run(getRaceControl(9693));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("session_key=9693");
  });

  it("returns an empty array for empty array input", async () => {
    mockFetch([]);

    const result = await run(getRaceControl(9693));

    expect(result).toEqual([]);
  });

  it("returns an empty array for non-array input", async () => {
    mockFetch({ error: "not found" });

    const result = await run(getRaceControl(9693));

    expect(result).toEqual([]);
  });
});

describe("getTeamRadio", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses team radio data with literal expected values", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 1,
        date: "2024-03-01T12:10:00Z",
        message: "Good pace, maintain the gap",
        driver_id: "max_verstappen",
      },
    ]);

    const result = await run(getTeamRadio(9693));

    expect(result).toHaveLength(1);
    expect(result[0].session_key).toBe(9693);
    expect(result[0].driver_number).toBe(1);
    expect(result[0].message).toBe("Good pace, maintain the gap");
    expect(result[0].driver_id).toBe("max_verstappen");
  });

  it("handles multiple team radio messages", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 1,
        date: "2024-03-01T12:10:00Z",
        message: "Good pace, maintain the gap",
        driver_id: "max_verstappen",
      },
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 44,
        date: "2024-03-01T12:11:00Z",
        message: "Box box, box box",
        driver_id: "lewis_hamilton",
      },
    ]);

    const result = await run(getTeamRadio(9693));

    expect(result).toHaveLength(2);
    expect(result[0].driver_number).toBe(1);
    expect(result[1].driver_number).toBe(44);
  });

  it("passes session_key query param", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchSpy;

    await run(getTeamRadio(9693));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("session_key=9693");
  });

  it("returns an empty array for empty array input", async () => {
    mockFetch([]);

    const result = await run(getTeamRadio(9693));

    expect(result).toEqual([]);
  });

  it("returns an empty array for non-array input", async () => {
    mockFetch({ error: "not found" });

    const result = await run(getTeamRadio(9693));

    expect(result).toEqual([]);
  });
});

describe("getOvertakes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses overtake data with literal expected values", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        date: "2024-03-01T12:15:00Z",
        overtaking_driver_number: 1,
        overtaken_driver_number: 44,
        position: 2,
      },
    ]);

    const result = await run(getOvertakes(9693));

    expect(result).toHaveLength(1);
    expect(result[0].overtaking_driver_number).toBe(1);
    expect(result[0].overtaken_driver_number).toBe(44);
    expect(result[0].position).toBe(2);
  });

  it("handles multiple overtakes", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        date: "2024-03-01T12:15:00Z",
        overtaking_driver_number: 1,
        overtaken_driver_number: 44,
        position: 2,
      },
      {
        session_key: 9693,
        meeting_key: 1254,
        date: "2024-03-01T12:16:00Z",
        overtaking_driver_number: 44,
        overtaken_driver_number: 1,
        position: 2,
      },
    ]);

    const result = await run(getOvertakes(9693));

    expect(result).toHaveLength(2);
    expect(result[0].overtaking_driver_number).toBe(1);
    expect(result[1].overtaking_driver_number).toBe(44);
  });

  it("passes session_key query param", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchSpy;

    await run(getOvertakes(9693));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("session_key=9693");
  });

  it("returns an empty array for empty array input", async () => {
    mockFetch([]);

    const result = await run(getOvertakes(9693));

    expect(result).toEqual([]);
  });

  it("returns an empty array for non-array input", async () => {
    mockFetch({ error: "not found" });

    const result = await run(getOvertakes(9693));

    expect(result).toEqual([]);
  });
});
