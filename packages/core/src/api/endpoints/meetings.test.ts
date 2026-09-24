import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type F1ClientService, F1ClientServiceLive } from "../../http/service";
import { getDrivers, getMeetings, getSessions } from "./meetings";

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

describe("getMeetings", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses meeting data and null-cleans nullable fields", async () => {
    mockFetch([
      {
        meeting_key: 1254,
        meeting_name: "Bahrain",
        meeting_official_name: "Formula 1 Gulf Air Bahrain Grand Prix 2024",
        meeting_round: 1,
        year: 2024,
        circuit_key: 1,
        circuit_short_name: "BAH",
        circuit_type: "Street",
        country_key: 97,
        country_name: "Bahrain",
        country_code: "BH",
        country_flag: null,
        location: "Sakhir",
        date_start: "2024-03-01T00:00:00Z",
        date_end: "2024-03-03T00:00:00Z",
        gmt_offset: "+03:00",
        is_cancelled: null,
      },
    ]);

    const result = await run(getMeetings(2024));

    expect(result).toHaveLength(1);
    expect(result[0].meeting_key).toBe(1254);
    expect(result[0].meeting_name).toBe("Bahrain");
    expect(result[0].year).toBe(2024);
    expect(result[0].meeting_round).toBe(1);
    expect(result[0].country_flag).toBeUndefined();
    expect(result[0].is_cancelled).toBeUndefined();
  });

  it("strips nulls from all nullable fields in the projected output", async () => {
    mockFetch([
      {
        meeting_key: 1255,
        meeting_name: "Saudi Arabia",
        meeting_official_name: "Formula 1 Saudi Arabian Grand Prix 2024",
        meeting_round: null,
        year: 2024,
        circuit_key: 2,
        circuit_short_name: "JED",
        circuit_type: "Street",
        country_key: 238,
        country_name: "Saudi Arabia",
        country_code: "SA",
        country_flag: null,
        location: "Jeddah",
        date_start: "2024-03-08T00:00:00Z",
        date_end: "2024-03-10T00:00:00Z",
        gmt_offset: "+03:00",
        is_cancelled: null,
      },
    ]);

    const result = await run(getMeetings(2024));

    expect(result).toHaveLength(1);
    expect(collectNulls(result)).toEqual([]);
    expect(result[0].meeting_round).toBeUndefined();
    expect(result[0].country_flag).toBeUndefined();
    expect(result[0].is_cancelled).toBeUndefined();
  });

  it("passes year query param", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchSpy;

    await run(getMeetings(2024));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("year=2024");
  });

  testEdgeCases("getMeetings", () => run(getMeetings(2024)));
});

describe("getSessions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses session data and null-cleans nullable fields", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        session_name: "Practice 1",
        session_type: "Practice",
        year: 2024,
        country_key: 97,
        country_name: "Bahrain",
        country_code: "BH",
        circuit_key: 1,
        circuit_short_name: "BAH",
        location: "Sakhir",
        date_start: "2024-03-01T08:00:00Z",
        date_end: "2024-03-01T09:30:00Z",
        gmt_offset: "+03:00",
        is_cancelled: null,
      },
    ]);

    const result = await run(getSessions(1254));

    expect(result).toHaveLength(1);
    expect(result[0].session_key).toBe(9693);
    expect(result[0].meeting_key).toBe(1254);
    expect(result[0].session_name).toBe("Practice 1");
    expect(result[0].session_type).toBe("Practice");
    expect(result[0].is_cancelled).toBeUndefined();
    expect(result[0].country_code).toBe("BH");
  });

  it("strips nulls from nullable fields", async () => {
    mockFetch([
      {
        session_key: 9694,
        meeting_key: 1254,
        session_name: "Practice 2",
        session_type: "Practice",
        year: 2024,
        country_key: 97,
        country_name: "Bahrain",
        country_code: null,
        circuit_key: 1,
        circuit_short_name: "BAH",
        location: "Sakhir",
        date_start: "2024-03-01T12:00:00Z",
        date_end: "2024-03-01T13:30:00Z",
        gmt_offset: "+03:00",
        is_cancelled: null,
      },
    ]);

    const result = await run(getSessions(1254));

    expect(result).toHaveLength(1);
    expect(collectNulls(result)).toEqual([]);
    expect(result[0].country_code).toBeUndefined();
    expect(result[0].is_cancelled).toBeUndefined();
  });

  it("passes meeting_key query param", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchSpy;

    await run(getSessions(1254));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("meeting_key=1254");
  });

  testEdgeCases("getSessions", () => run(getSessions(1254)));
});

describe("getDrivers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses driver data and null-cleans nullable fields", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 1,
        broadcast_name: "VER",
        full_name: "Max Verstappen",
        first_name: "Max",
        last_name: "Verstappen",
        name_acronym: "VER",
        team_name: "Red Bull Racing",
        team_colour: "3671C6",
        headshot_url: null,
      },
    ]);

    const result = await run(getDrivers(9693));

    expect(result).toHaveLength(1);
    expect(result[0].driver_number).toBe(1);
    expect(result[0].full_name).toBe("Max Verstappen");
    expect(result[0].team_name).toBe("Red Bull Racing");
    expect(result[0].headshot_url).toBeUndefined();
  });

  it("strips nulls from nullable headshot_url", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 33,
        broadcast_name: "VER",
        full_name: "Max Verstappen",
        first_name: "Max",
        last_name: "Verstappen",
        name_acronym: "VER",
        team_name: "Red Bull Racing",
        team_colour: "3671C6",
        headshot_url: null,
      },
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 44,
        broadcast_name: "HAM",
        full_name: "Lewis Hamilton",
        first_name: "Lewis",
        last_name: "Hamilton",
        name_acronym: "HAM",
        team_name: "Mercedes",
        team_colour: "00D2BE",
        headshot_url: null,
      },
    ]);

    const result = await run(getDrivers(9693));

    expect(result).toHaveLength(2);
    expect(collectNulls(result)).toEqual([]);
    expect(result[0].headshot_url).toBeUndefined();
    expect(result[1].headshot_url).toBeUndefined();
  });

  it("passes session_key query param", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchSpy;

    await run(getDrivers(9693));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("session_key=9693");
  });

  testEdgeCases("getDrivers", () => run(getDrivers(9693)));
});
