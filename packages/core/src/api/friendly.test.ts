import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./openf1", () => ({
  getMeetings: vi.fn(),
  getSessions: vi.fn(),
  getOpenF1Laps: vi.fn(),
  getDrivers: vi.fn(),
  getStints: vi.fn(),
  getPitStops: vi.fn(),
  getPosition: vi.fn(),
  getCarData: vi.fn(),
  getWeather: vi.fn(),
}));

import {
  getFastestLap,
  getRacePitStops,
  getRaceStints,
  getRaceTelemetry,
  getRaceWeather,
} from "./friendly";
import {
  getCarData,
  getMeetings,
  getOpenF1Laps,
  getPitStops,
  getSessions,
  getStints,
  getWeather,
} from "./openf1";
import { toPromise } from "./promises";

const getMeetingsMock = getMeetings as ReturnType<typeof vi.fn>;
const getSessionsMock = getSessions as ReturnType<typeof vi.fn>;
const getStintsMock = getStints as ReturnType<typeof vi.fn>;
const getPitStopsMock = getPitStops as ReturnType<typeof vi.fn>;
const getWeatherMock = getWeather as ReturnType<typeof vi.fn>;
const getCarDataMock = getCarData as ReturnType<typeof vi.fn>;
const getOpenF1LapsMock = getOpenF1Laps as ReturnType<typeof vi.fn>;

describe("getRaceStints", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getMeetingsMock.mockReturnValue(
      Effect.succeed([
        {
          meeting_key: 1254,
          meeting_name: "Miami Grand Prix",
          year: 2026,
          meeting_round: 6,
        },
      ]),
    );
    getSessionsMock.mockReturnValue(
      Effect.succeed([
        {
          session_key: 9693,
          meeting_key: 1254,
          session_name: "Race",
        },
      ]),
    );
  });

  it("should filter by driver code", async () => {
    const mockStints = [
      { stint_number: 1, compound: "MEDIUM", driver_number: 1 },
      { stint_number: 1, compound: "SOFT", driver_number: 44 },
    ];

    getStintsMock.mockReturnValue(Effect.succeed(mockStints));

    const result = await toPromise(getRaceStints({ year: 2026, raceName: "Miami", driver: "VER" }));

    expect(result).toHaveLength(1);
    expect(result[0].compound).toBe("MEDIUM");
  });
});

describe("getRacePitStops", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return pit stops with sessionKey", async () => {
    getPitStopsMock.mockReturnValue(Effect.succeed([{ lap_number: 20 }]));

    const result = await toPromise(getRacePitStops({ year: 2026, sessionKey: 9693 }));

    expect(result).toHaveLength(1);
  });

  it("should pass driver to getPitStops", async () => {
    const mockPits = [{ lap_number: 20, driver_number: 1 }];
    getPitStopsMock.mockReturnValue(Effect.succeed(mockPits));

    const result = await toPromise(
      getRacePitStops({ year: 2026, sessionKey: 9693, driver: "VER" }),
    );

    expect(result).toHaveLength(1);
  });
});

describe("getRaceWeather", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return weather with sessionKey", async () => {
    getWeatherMock.mockReturnValue(Effect.succeed([{ air_temperature: 25 }]));

    const result = await toPromise(getRaceWeather({ year: 2026, sessionKey: 9693 }));

    expect(result).toHaveLength(1);
    expect(result[0].air_temperature).toBe(25);
  });
});

describe("getRaceTelemetry", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return telemetry with sessionKey", async () => {
    getCarDataMock.mockReturnValue(Effect.succeed([{ speed: 320 }]));

    const result = await toPromise(
      getRaceTelemetry({ year: 2026, sessionKey: 9693, driver: "VER" }),
    );

    expect(result).toHaveLength(1);
    expect(result[0].speed).toBe(320);
  });

  it("should convert driver code to number", async () => {
    const mockTelemetry = [
      { speed: 320, driver_number: 1 },
      { speed: 315, driver_number: 44 },
    ];
    getCarDataMock.mockReturnValue(Effect.succeed(mockTelemetry));

    const result = await toPromise(
      getRaceTelemetry({ year: 2026, sessionKey: 9693, driver: "VER" }),
    );

    expect(getCarDataMock).toHaveBeenCalledWith(9693, 1);
    expect(result).toHaveLength(2);
  });
});

describe("session and meetingKey resolution", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getSessionsMock.mockReturnValue(
      Effect.succeed([
        {
          session_key: 9693,
          meeting_key: 1254,
          session_name: "Race",
          session_type: "Race",
        },
      ]),
    );
    getStintsMock.mockReturnValue(Effect.succeed([{ stint_number: 1, driver_number: 1 }]));
  });

  it("should resolve via meetingKey without querying meetings", async () => {
    const result = await toPromise(
      getRaceStints({ year: 2026, meetingKey: 1254, session: "race" }),
    );

    expect(getMeetingsMock).not.toHaveBeenCalled();
    expect(getSessionsMock).toHaveBeenCalledWith(1254);
    expect(result).toHaveLength(1);
  });

  it("should honor the session filter", async () => {
    const result = await toPromise(
      getRaceStints({ year: 2026, meetingKey: 1254, session: "qualifying" }),
    );

    expect(result).toHaveLength(0);
  });
});

describe("getFastestLap", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getMeetingsMock.mockReturnValue(
      Effect.succeed([
        {
          meeting_key: 1254,
          meeting_name: "Miami Grand Prix",
          year: 2026,
          meeting_round: 6,
        },
      ]),
    );
    getSessionsMock.mockReturnValue(
      Effect.succeed([
        {
          session_key: 9693,
          meeting_key: 1254,
          session_name: "Race",
          session_type: "Race",
        },
      ]),
    );
  });

  it("should return the lap number with the fastest lap_duration", async () => {
    getOpenF1LapsMock.mockReturnValue(
      Effect.succeed([
        { lap_number: 1, lap_duration: 91.5 },
        { lap_number: 2, lap_duration: 89.2 },
        { lap_number: 3, lap_duration: 90.1 },
      ]),
    );

    const result = await toPromise(
      getFastestLap({ year: 2026, sessionKey: undefined, raceName: "Miami", driver: "VER" }),
    );

    expect(result).toBe(2);
    expect(getOpenF1LapsMock).toHaveBeenCalledWith(9693, 1);
  });

  it("should ignore laps without a duration", async () => {
    getOpenF1LapsMock.mockReturnValue(
      Effect.succeed([
        { lap_number: 1, lap_duration: 91.5 },
        { lap_number: 2, lap_duration: undefined },
        { lap_number: 3, lap_duration: 88.4 },
      ]),
    );

    const result = await toPromise(getFastestLap({ year: 2026, raceName: "Miami", driver: "HAM" }));

    expect(result).toBe(3);
  });

  it("should return null when no laps match", async () => {
    getOpenF1LapsMock.mockReturnValue(Effect.succeed([]));

    const result = await toPromise(getFastestLap({ year: 2026, raceName: "Miami", driver: "VER" }));

    expect(result).toBeNull();
  });

  it("should return null when the session cannot be resolved", async () => {
    getMeetingsMock.mockReturnValue(Effect.succeed([]));

    const result = await toPromise(
      getFastestLap({ year: 1900, raceName: "Nowhere", driver: "VER" }),
    );

    expect(result).toBeNull();
    expect(getOpenF1LapsMock).not.toHaveBeenCalled();
  });
});
