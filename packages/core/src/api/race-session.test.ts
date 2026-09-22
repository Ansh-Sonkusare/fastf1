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

import { getCarData, getMeetings, getOpenF1Laps, getSessions } from "./openf1";
import { toPromise } from "./promises";
import {
  resolveDriverNumber,
  resolveMeeting,
  resolveSession,
  resolveTelemetryLapWindow,
} from "./race-session";

const getMeetingsMock = getMeetings as ReturnType<typeof vi.fn>;
const getSessionsMock = getSessions as ReturnType<typeof vi.fn>;
const getOpenF1LapsMock = getOpenF1Laps as ReturnType<typeof vi.fn>;
const getCarDataMock = getCarData as ReturnType<typeof vi.fn>;

const MIAMI_2026 = {
  meeting_key: 1254,
  meeting_name: "Miami Grand Prix",
  meeting_official_name: "2026 Miami Grand Prix",
  meeting_round: 6,
  year: 2026,
};

const MIAMI_RACE_SESSION = {
  session_key: 9693,
  meeting_key: 1254,
  session_name: "Race",
  session_type: "Race",
};

const MIAMI_PRACTICE_SESSION = {
  session_key: 9691,
  meeting_key: 1254,
  session_name: "Practice 3",
  session_type: "Practice",
};

describe("resolveDriverNumber", () => {
  it("should resolve a driver code", () => {
    expect(resolveDriverNumber("VER")).toBe(1);
    expect(resolveDriverNumber("ham")).toBe(44);
  });

  it("should pass through numeric driver numbers", () => {
    expect(resolveDriverNumber(44)).toBe(44);
    expect(resolveDriverNumber(1)).toBe(1);
  });

  it("should resolve numeric driver strings", () => {
    expect(resolveDriverNumber("44")).toBe(44);
  });

  it("should return undefined for unknown drivers", () => {
    expect(resolveDriverNumber("XXX")).toBeUndefined();
    expect(resolveDriverNumber(undefined)).toBeUndefined();
  });
});

describe("resolveMeeting", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should resolve a meeting by name", async () => {
    getMeetingsMock.mockReturnValue(Effect.succeed([MIAMI_2026]));

    const meeting = await toPromise(resolveMeeting({ year: 2026, name: "miami" }));

    expect(meeting?.meeting_key).toBe(1254);
  });

  it("should resolve a meeting by round", async () => {
    getMeetingsMock.mockReturnValue(
      Effect.succeed([
        { ...MIAMI_2026, meeting_key: 1250, meeting_name: "Bahrain Grand Prix", meeting_round: 1 },
        MIAMI_2026,
      ]),
    );

    const meeting = await toPromise(resolveMeeting({ year: 2026, round: 6 }));

    expect(meeting?.meeting_key).toBe(1254);
  });

  it("should return null when no meetings exist", async () => {
    getMeetingsMock.mockReturnValue(Effect.succeed([]));

    const meeting = await toPromise(resolveMeeting({ year: 1900 }));

    expect(meeting).toBeNull();
  });

  it("should return null when the name does not match", async () => {
    getMeetingsMock.mockReturnValue(Effect.succeed([MIAMI_2026]));

    const meeting = await toPromise(resolveMeeting({ year: 2026, name: "Monaco" }));

    expect(meeting).toBeNull();
  });
});

describe("resolveSession", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getMeetingsMock.mockReturnValue(Effect.succeed([MIAMI_2026]));
    getSessionsMock.mockReturnValue(Effect.succeed([MIAMI_PRACTICE_SESSION, MIAMI_RACE_SESSION]));
  });

  it("should use a direct session key without meeting queries", async () => {
    const resolved = await toPromise(resolveSession({ year: 2026, sessionKey: 9693 }));

    expect(resolved?.sessionKey).toBe(9693);
    expect(resolved?.session).toBeNull();
    expect(resolved?.meeting).toBeNull();
    expect(getMeetingsMock).not.toHaveBeenCalled();
    expect(getSessionsMock).not.toHaveBeenCalled();
  });

  it("should resolve via meeting key", async () => {
    const resolved = await toPromise(resolveSession({ year: 2026, meetingKey: 1254 }));

    expect(getSessionsMock).toHaveBeenCalledWith(1254);
    expect(getMeetingsMock).not.toHaveBeenCalled();
    expect(resolved?.sessionKey).toBe(9693);
    expect(resolved?.meeting).toBeNull();
  });

  it("should resolve via race name and session type", async () => {
    const resolved = await toPromise(
      resolveSession({ year: 2026, raceName: "Miami", session: "race" }),
    );

    expect(resolved?.sessionKey).toBe(9693);
    expect(resolved?.meeting?.meeting_key).toBe(1254);
    expect(getMeetingsMock).toHaveBeenCalledWith(2026);
    expect(getSessionsMock).toHaveBeenCalledWith(1254);
  });

  it("should resolve via round", async () => {
    getMeetingsMock.mockReturnValue(
      Effect.succeed([
        { ...MIAMI_2026, meeting_key: 1250, meeting_name: "Bahrain Grand Prix", meeting_round: 1 },
        MIAMI_2026,
      ]),
    );

    const resolved = await toPromise(resolveSession({ year: 2026, round: 6 }));

    expect(getSessionsMock).toHaveBeenCalledWith(1254);
    expect(resolved?.meeting?.meeting_key).toBe(1254);
    expect(resolved?.sessionKey).toBe(9693);
  });

  it("should default to the race session when no session type is given", async () => {
    const resolved = await toPromise(resolveSession({ year: 2026, raceName: "Miami" }));

    expect(resolved?.sessionKey).toBe(9693);
  });

  it("should return null when no meetings match", async () => {
    getMeetingsMock.mockReturnValue(Effect.succeed([]));

    const resolved = await toPromise(resolveSession({ year: 1900 }));

    expect(resolved).toBeNull();
  });

  it("should return null when no sessions exist", async () => {
    getSessionsMock.mockReturnValue(Effect.succeed([]));

    const resolved = await toPromise(resolveSession({ year: 2026, raceName: "Miami" }));

    expect(resolved).toBeNull();
  });

  it("should return null when the session type does not match", async () => {
    const resolved = await toPromise(
      resolveSession({ year: 2026, raceName: "Miami", session: "qualifying" }),
    );

    expect(resolved).toBeNull();
  });
});

describe("resolveTelemetryLapWindow", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getOpenF1LapsMock.mockReturnValue(
      Effect.succeed([
        { lap_number: 5, date_start: "2026-03-05T20:01:00.000Z", lap_duration: 90 },
        { lap_number: 6, date_start: "2026-03-05T20:02:30.000Z", lap_duration: 92 },
        { lap_number: 7, date_start: "2026-03-05T20:04:02.000Z", lap_duration: 91 },
      ]),
    );
    getCarDataMock.mockReturnValue(
      Effect.succeed([{ speed: 320, date: "2026-03-05T20:01:10.000Z" }]),
    );
  });

  it("should filter telemetry to a single lap", async () => {
    getOpenF1LapsMock.mockReturnValue(
      Effect.succeed([{ lap_number: 5, date_start: "2026-03-05T20:01:00.000Z", lap_duration: 90 }]),
    );

    const result = await toPromise(resolveTelemetryLapWindow(9693, "VER", { lap: 5 }));

    expect(getOpenF1LapsMock).toHaveBeenCalledWith(9693, 1, 5);
    expect(result.laps).toHaveLength(1);
    expect(result.laps[0].lap_number).toBe(5);
    expect(result.driverNumber).toBe(1);
    expect(getCarDataMock).toHaveBeenCalledWith(9693, 1, {
      dateGt: "2026-03-05T20:01:00.000Z",
      dateLt: "2026-03-05T20:02:30.000Z",
    });
    expect(result.carData).toHaveLength(1);
  });

  it("should filter telemetry to a lap window", async () => {
    const result = await toPromise(resolveTelemetryLapWindow(9693, 44, { lapStart: 6, lapEnd: 7 }));

    expect(getOpenF1LapsMock).toHaveBeenCalledWith(9693, 44);
    expect(result.laps).toHaveLength(2);
    expect(result.laps.map((l) => l.lap_number)).toEqual([6, 7]);
    expect(getCarDataMock).toHaveBeenCalledWith(9693, 44, {
      dateGt: "2026-03-05T20:02:30.000Z",
      dateLt: "2026-03-05T20:05:33.000Z",
    });
  });

  it("should skip lap queries when no lap constraint is given", async () => {
    const result = await toPromise(resolveTelemetryLapWindow(9693, "VER"));

    expect(getOpenF1LapsMock).not.toHaveBeenCalled();
    expect(getCarDataMock).toHaveBeenCalledWith(9693, 1);
    expect(result.carData).toHaveLength(1);
    expect(result.laps).toEqual([]);
  });

  it("should return unbounded telemetry when the lap window has no laps", async () => {
    getOpenF1LapsMock.mockReturnValue(Effect.succeed([]));

    const result = await toPromise(
      resolveTelemetryLapWindow(9693, "VER", { lapStart: 90, lapEnd: 99 }),
    );

    expect(result.laps).toEqual([]);
    expect(getCarDataMock).toHaveBeenCalledWith(9693, 1);
  });
});
