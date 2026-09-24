import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useFastestLap,
  useRacePitStops,
  useRaceStints,
  useRaceTelemetry,
  useRaceWeather,
} from "./useRaceHooks";

vi.mock("@f1/core", () => ({
  getRacePitStops: vi.fn(),
  getRaceStints: vi.fn(),
  getRaceTelemetry: vi.fn(),
  getRaceWeather: vi.fn(),
  getFastestLap: vi.fn(),
  toPromise: (x: unknown) => x,
}));

import {
  getFastestLap,
  getRacePitStops,
  getRaceStints,
  getRaceTelemetry,
  getRaceWeather,
} from "@f1/core";

const mockGetRaceStints = getRaceStints as ReturnType<typeof vi.fn>;
const mockGetRacePitStops = getRacePitStops as ReturnType<typeof vi.fn>;
const mockGetRaceWeather = getRaceWeather as ReturnType<typeof vi.fn>;
const mockGetRaceTelemetry = getRaceTelemetry as ReturnType<typeof vi.fn>;
const mockGetFastestLap = getFastestLap as ReturnType<typeof vi.fn>;

const stint = {
  session_key: 1,
  meeting_key: 1,
  driver_number: 44,
  stint_number: 1,
  lap_start: 1,
  lap_end: 20,
  compound: "SOFT",
  tyre_age_at_start: 0,
};

const pitStop = {
  session_key: 1,
  meeting_key: 1,
  driver_number: 44,
  lap_number: 12,
  stop_number: 1,
  pit_duration: 20.1,
  lane_duration: 20.1,
  stop_duration: 20.1,
  date: "2026-04-05T15:00:00Z",
};

const weather = {
  session_key: 1,
  meeting_key: 1,
  date: "2026-04-05T15:00:00Z",
  air_temperature: 25.4,
  track_temperature: 30.1,
  wind_direction: 200,
};

const telemetry = {
  session_key: 1,
  meeting_key: 1,
  driver_number: 44,
  date: "2026-04-05T15:00:00Z",
  speed: 300,
};

describe("useRaceHooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return stints data on success", async () => {
    mockGetRaceStints.mockResolvedValue([stint]);

    const { result } = renderHook(() => useRaceStints(2026, "Miami"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([stint]);
    expect(result.current.error).toBeNull();
  });

  it("should use initialData for stints without loading", () => {
    const { result } = renderHook(() =>
      useRaceStints(2026, "Miami", undefined, "race", undefined, { initialData: [stint] }),
    );

    expect(mockGetRaceStints).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([stint]);
    expect(result.current.isLoading).toBe(false);
  });

  it("should handle stints error state", async () => {
    mockGetRaceStints.mockRejectedValue(new Error("API Error"));

    const { result } = renderHook(() => useRaceStints(2026, "Miami"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeNull();
  });

  it("should return pit stops data on success", async () => {
    mockGetRacePitStops.mockResolvedValue([pitStop]);

    const { result } = renderHook(() => useRacePitStops(2026, "Miami", "HAM"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetRacePitStops).toHaveBeenCalledWith({
      year: 2026,
      raceName: "Miami",
      driver: "HAM",
      session: "race",
    });
    expect(result.current.data).toEqual([pitStop]);
  });

  it("should return weather data on success", async () => {
    mockGetRaceWeather.mockResolvedValue([weather]);

    const { result } = renderHook(() => useRaceWeather(2026, "Miami"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([weather]);
  });

  it("should return telemetry data on success", async () => {
    mockGetRaceTelemetry.mockResolvedValue([telemetry]);

    const { result } = renderHook(() => useRaceTelemetry(2026, "Miami", "HAM"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetRaceTelemetry).toHaveBeenCalledWith({
      year: 2026,
      raceName: "Miami",
      driver: "HAM",
      session: "race",
    });
    expect(result.current.data).toEqual([telemetry]);
  });

  it("should filter telemetry to a lap window", async () => {
    mockGetRaceTelemetry.mockResolvedValue([telemetry]);

    const { result } = renderHook(() => useRaceTelemetry(2026, "Miami", "HAM", "race", 1254, 6, 8));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetRaceTelemetry).toHaveBeenCalledWith({
      year: 2026,
      raceName: "Miami",
      driver: "HAM",
      session: "race",
      meetingKey: 1254,
      lap: 6,
      lapStart: 8,
    });
    expect(result.current.data).toEqual([telemetry]);
  });

  it("should return fastest lap on success", async () => {
    mockGetFastestLap.mockResolvedValue(24);

    const { result } = renderHook(() => useFastestLap(2026, "Miami", "HAM"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetFastestLap).toHaveBeenCalledWith({
      year: 2026,
      raceName: "Miami",
      driver: "HAM",
      session: "race",
    });
    expect(result.current).toEqual({ lap: 24, isLoading: false, error: null });
  });

  it("should handle fastest lap error state", async () => {
    mockGetFastestLap.mockRejectedValue(new Error("API Error"));

    const { result } = renderHook(() => useFastestLap(2026, "Miami", "HAM"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeDefined();
    expect(result.current.lap).toBeNull();
  });

  it("should pass round and sessionKey for fastest lap", async () => {
    mockGetFastestLap.mockResolvedValue(24);

    const { result } = renderHook(() => useFastestLap(2026, "Miami", "HAM", "race", 1254, 6, 9693));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetFastestLap).toHaveBeenCalledWith({
      year: 2026,
      raceName: "Miami",
      driver: "HAM",
      session: "race",
      meetingKey: 1254,
      round: 6,
      sessionKey: 9693,
    });
    expect(result.current.lap).toBe(24);
  });
});
