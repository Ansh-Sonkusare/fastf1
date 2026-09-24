import { describe, expect, it } from "vitest";
import { getOpenF1BaseUrl } from "./_shared";
import { getCarData, getLocation } from "./telemetry";
import { collectNulls, mockFetch, run, setupMocks, testEdgeCases } from "./test-utils";

describe("getCarData", () => {
  setupMocks();

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

  it("strips nulls from nullable fields when present", async () => {
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

    expect(collectNulls(result)).toEqual([]);
  });

  it("passes correct full URL with session_key only", async () => {
    const spy = mockFetch([]);

    await run(getCarData(9693));

    const url = spy.mock.calls[0][0] as string;
    expect(url).toBe(`${getOpenF1BaseUrl()}/car_data?session_key=9693`);
  });

  it("includes driver_number when provided", async () => {
    const spy = mockFetch([]);

    await run(getCarData(9693, 1));

    const url = spy.mock.calls[0][0] as string;
    expect(url).toBe(`${getOpenF1BaseUrl()}/car_data?session_key=9693&driver_number=1`);
  });

  it("includes date range when provided", async () => {
    const spy = mockFetch([]);

    await run(
      getCarData(9693, undefined, {
        dateGt: "2024-03-01T08:00:00Z",
        dateLt: "2024-03-01T10:00:00Z",
      }),
    );

    const url = spy.mock.calls[0][0] as string;
    expect(url).toBe(
      `${getOpenF1BaseUrl()}/car_data?session_key=9693&date%3E=2024-03-01T08%3A00%3A00Z&date%3C=2024-03-01T10%3A00%3A00Z`,
    );
  });

  testEdgeCases(() => run(getCarData(9693)));
});

describe("getLocation", () => {
  setupMocks();

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

  it("strips nulls from nullable z coordinate when present", async () => {
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

    expect(collectNulls(result)).toEqual([]);
  });

  it("passes correct full URL with session_key only", async () => {
    const spy = mockFetch([]);

    await run(getLocation(9693));

    const url = spy.mock.calls[0][0] as string;
    expect(url).toBe(`${getOpenF1BaseUrl()}/location?session_key=9693`);
  });

  it("includes driver_number when provided", async () => {
    const spy = mockFetch([]);

    await run(getLocation(9693, 1));

    const url = spy.mock.calls[0][0] as string;
    expect(url).toBe(`${getOpenF1BaseUrl()}/location?session_key=9693&driver_number=1`);
  });

  it("rejects when required x field is null", async () => {
    mockFetch([
      {
        session_key: 9693,
        meeting_key: 1254,
        driver_number: 1,
        date: "2024-03-01T12:00:00.000Z",
        x: null,
        y: 456.2,
        z: 50,
      },
    ]);

    await expect(run(getLocation(9693))).rejects.toThrow(/Expected number, actual null/);
  });

  testEdgeCases(() => run(getLocation(9693)));
});
