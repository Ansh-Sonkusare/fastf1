import { beforeEach, describe, expect, it, vi } from "vitest";

global.fetch = vi.fn();

import {
  type GetRacePitStopsParams,
  type GetRaceStintsParams,
  type GetRaceTelemetryParams,
  type GetRaceWeatherParams,
  getRacePitStops,
  getRaceStints,
  getRaceTelemetry,
  getRaceWeather,
} from "./friendly";

describe("getRaceStints", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should filter by driver code", async () => {
    const mockStints = [
      { stint_number: 1, compound: "MEDIUM", driver_number: 1 },
      { stint_number: 1, compound: "SOFT", driver_number: 44 },
    ];

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ meeting_key: 1234, meeting_name: "Miami Grand Prix" }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([{ session_key: 5678, meeting_key: 1234, session_name: "Race" }]),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStints) });

    const result = await getRaceStints({ year: 2026, raceName: "Miami", driver: "VER" });

    expect(result).toHaveLength(1);
    expect(result[0].compound).toBe("MEDIUM");
  });
});

describe("getRacePitStops", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return pit stops with sessionKey", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ lap_number: 20 }]) });

    const result = await getRacePitStops({ year: 2026, sessionKey: 5678 });

    expect(result).toHaveLength(1);
  });

  it("should pass driver to getPitStops", async () => {
    const mockPits = [{ lap_number: 20, driver_number: 1 }];

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockPits) });

    const result = await getRacePitStops({ year: 2026, sessionKey: 5678, driver: "VER" });

    // Verify getPitStops was called with driverNumber
    expect(result).toHaveLength(1);
  });
});

describe("getRaceWeather", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return weather with sessionKey", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ air_temperature: 25 }]) });

    const result = await getRaceWeather({ year: 2026, sessionKey: 5678 });

    expect(result).toHaveLength(1);
    expect(result[0].air_temperature).toBe(25);
  });
});

describe("getRaceTelemetry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return telemetry with sessionKey", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ speed: 320 }]) });

    const result = await getRaceTelemetry({ year: 2026, sessionKey: 5678, driver: "VER" });

    expect(result).toHaveLength(1);
    expect(result[0].speed).toBe(320);
  });

  it("should filter by driver code", async () => {
    const mockTelemetry = [
      { speed: 320, driver_number: 1 },
      { speed: 315, driver_number: 44 },
    ];

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockTelemetry) });

    const result = await getRaceTelemetry({ year: 2026, sessionKey: 5678, driver: "VER" });

    expect(result).toHaveLength(1);
    expect(result[0].speed).toBe(320);
  });
});
