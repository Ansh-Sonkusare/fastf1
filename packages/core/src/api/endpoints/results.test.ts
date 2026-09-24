import { beforeEach, describe, expect, it, vi } from "vitest";
import { type F1ClientService, F1ClientServiceLive } from "../../http/service";
import { getOpenF1BaseUrl } from "./_shared";
import { getIntervals, getSessionResult, getStartingGrid } from "./results";
import { collectNulls, mockFetch, run, testEdgeCases } from "./test-utils";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("getSessionResult", () => {
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

    expect(result).toHaveLength(2);
    expect(result[0].session_key).toBe(9693);
    expect(result[0].driver_number).toBe(1);
    expect(result[0].position).toBe(1);
    expect(result[0].duration).toBe(5400.123);
    expect(result[0].gap_to_leader).toBe(0);
    expect(result[0].number_of_laps).toBe(57);
    expect(result[0].dnf).toBe(false);
    expect(result[0].dns).toBe(false);
    expect(result[0].dsq).toBe(false);
    expect(result[1].dnf).toBe(true);
    expect(result[1].number_of_laps).toBe(30);
  });

  it("removes null values from nullable fields", async () => {
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

  it("passes session_key query param in full URL", async () => {
    const spy = mockFetch([]);
    await run(getSessionResult(9693));
    expect(spy).toHaveBeenCalledOnce();
    const url = spy.mock.calls[0][0] as string;
    expect(url).toBe(`${getOpenF1BaseUrl()}/session_result?session_key=9693`);
  });

  testEdgeCases(() => run(getSessionResult(9693)));
});

describe("getStartingGrid", () => {
  it("parses starting grid data with literal expected values", async () => {
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
        lap_duration: null,
      },
    ]);

    const result = await run(getStartingGrid(9698));

    expect(result).toHaveLength(3);
    expect(result[0].session_key).toBe(9698);
    expect(result[0].driver_number).toBe(1);
    expect(result[0].position).toBe(1);
    expect(result[0].lap_duration).toBe(95.123);
    expect(result[1].position).toBe(2);
    expect(result[1].lap_duration).toBe(95.456);
    expect(result[2].position).toBe(3);
    expect(result[2].lap_duration).toBeUndefined();
  });

  it("removes null values from nullable lap_duration", async () => {
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

  it("passes session_key query param in full URL", async () => {
    const spy = mockFetch([]);
    await run(getStartingGrid(9698));
    expect(spy).toHaveBeenCalledOnce();
    const url = spy.mock.calls[0][0] as string;
    expect(url).toBe(`${getOpenF1BaseUrl()}/starting_grid?session_key=9698`);
  });

  testEdgeCases(() => run(getStartingGrid(9698)));
});

describe("getIntervals", () => {
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
        interval: null,
      },
    ]);

    const result = await run(getIntervals(9693));

    expect(result).toHaveLength(3);
    expect(result[0].session_key).toBe(9693);
    expect(result[0].driver_number).toBe(1);
    expect(result[0].gap_to_leader).toBe(0);
    expect(result[0].interval).toBe(0);
    expect(result[1].gap_to_leader).toBe(2.5);
    expect(result[1].interval).toBe(2.5);
    expect(result[2].gap_to_leader).toBe(5.1);
    expect(result[2].interval).toBeUndefined();
  });

  it("removes null values from nullable fields", async () => {
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

  it("passes session_key query param in full URL", async () => {
    const spy = mockFetch([]);
    await run(getIntervals(9693));
    expect(spy).toHaveBeenCalledOnce();
    const url = spy.mock.calls[0][0] as string;
    expect(url).toBe(`${getOpenF1BaseUrl()}/intervals?session_key=9693`);
  });

  testEdgeCases(() => run(getIntervals(9693)));
});
