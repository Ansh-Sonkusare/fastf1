import { Effect } from "effect";
import { F1ClientService } from "../http/service";
import type { CarData, OpenF1Lap, OpenF1Pit, Position, Stint, Weather } from "../schemas/openf1";
import {
  getOpenF1BaseUrl,
  getCarData as getOpenF1CarData,
  getDrivers as getOpenF1Drivers,
  getOpenF1Laps,
  getPitStops as getOpenF1PitStops,
  getStints as getOpenF1Stints,
  getWeather as getOpenF1Weather,
} from "./openf1";
import {
  resolveDriverNumber,
  resolveMeeting,
  resolveSession,
  resolveTelemetryLapWindow,
} from "./race-session";

export interface GetRaceParams {
  year: number;
  name?: string;
  round?: number;
}

export const getRace = Effect.fn("getRace")(function* (params: GetRaceParams) {
  return yield* resolveMeeting({ year: params.year, name: params.name, round: params.round });
});

export interface GetSessionParams {
  year: number;
  raceName?: string;
  round?: number;
  session?: string;
}

export const getSession = Effect.fn("getSession")(function* (params: GetSessionParams) {
  const resolved = yield* resolveSession({
    year: params.year,
    raceName: params.raceName,
    round: params.round,
    session: params.session,
  });
  return resolved?.session ?? null;
});

export interface GetLapsParams {
  year: number;
  raceName?: string;
  round?: number;
  driver?: string | number;
  lap?: number;
  sessionKey?: number;
}

export const getLaps = Effect.fn("getLaps")(function* (params: GetLapsParams) {
  const resolved = yield* resolveSession({
    year: params.year,
    raceName: params.raceName,
    round: params.round,
    sessionKey: params.sessionKey,
  });
  if (!resolved) return [] as OpenF1Lap[];

  return yield* getOpenF1Laps(resolved.sessionKey, resolveDriverNumber(params.driver), params.lap);
});

export const getDrivers = getOpenF1Drivers;

export const getStints = getOpenF1Stints;

export const getPositions = Effect.fn("getPositions")(function* (sessionKey: number) {
  const client = yield* F1ClientService;
  return yield* client.fetch<Position[]>(`${getOpenF1BaseUrl()}/positions`, {
    params: { session_key: sessionKey },
  });
});

export interface GetRaceStintsParams {
  year: number;
  raceName?: string;
  round?: number;
  meetingKey?: number;
  driver?: string | number;
  session?: string;
  sessionKey?: number;
}

export const getRaceStints = Effect.fn("getRaceStints")(function* (params: GetRaceStintsParams) {
  const resolved = yield* resolveSession({
    year: params.year,
    raceName: params.raceName,
    round: params.round,
    session: params.session,
    sessionKey: params.sessionKey,
    meetingKey: params.meetingKey,
  });
  if (!resolved) return [] as Stint[];

  const stints = yield* getOpenF1Stints(resolved.sessionKey);

  if (!params.driver) return stints;

  const driverNum = resolveDriverNumber(params.driver);
  return driverNum !== undefined ? stints.filter((s) => Number(s.driver_number) === driverNum) : [];
});

export const getPitStops = getOpenF1PitStops;

export const getWeather = getOpenF1Weather;

export const getCarData = getOpenF1CarData;

export interface GetRacePitStopsParams {
  year: number;
  raceName?: string;
  round?: number;
  meetingKey?: number;
  driver?: string | number;
  session?: string;
  sessionKey?: number;
}

export const getRacePitStops = Effect.fn("getRacePitStops")(function* (
  params: GetRacePitStopsParams,
) {
  const resolved = yield* resolveSession({
    year: params.year,
    raceName: params.raceName,
    round: params.round,
    session: params.session,
    sessionKey: params.sessionKey,
    meetingKey: params.meetingKey,
  });
  if (!resolved) return [] as OpenF1Pit[];

  if (!params.driver) return yield* getOpenF1PitStops(resolved.sessionKey);

  return yield* getOpenF1PitStops(resolved.sessionKey, resolveDriverNumber(params.driver));
});

export interface GetRaceWeatherParams {
  year: number;
  raceName?: string;
  round?: number;
  meetingKey?: number;
  session?: string;
  sessionKey?: number;
}

export const getRaceWeather = Effect.fn("getRaceWeather")(function* (params: GetRaceWeatherParams) {
  const resolved = yield* resolveSession({
    year: params.year,
    raceName: params.raceName,
    round: params.round,
    session: params.session,
    sessionKey: params.sessionKey,
    meetingKey: params.meetingKey,
  });
  if (!resolved) return [] as Weather[];

  return yield* getOpenF1Weather(resolved.sessionKey);
});

export interface GetRaceTelemetryParams {
  year: number;
  raceName?: string;
  round?: number;
  meetingKey?: number;
  driver: string | number;
  session?: string;
  sessionKey?: number;
  lap?: number;
}

export const getRaceTelemetry = Effect.fn("getRaceTelemetry")(function* (
  params: GetRaceTelemetryParams,
) {
  const resolved = yield* resolveSession({
    year: params.year,
    raceName: params.raceName,
    round: params.round,
    session: params.session,
    sessionKey: params.sessionKey,
    meetingKey: params.meetingKey,
  });
  if (!resolved) return [] as CarData[];

  const { carData } = yield* resolveTelemetryLapWindow(resolved.sessionKey, params.driver, {
    lap: params.lap,
  });
  return carData;
});

export interface GetFastestLapParams {
  year: number;
  raceName?: string;
  meetingKey?: number;
  driver?: string | number;
  session?: string;
}

export const getFastestLap = Effect.fn("getFastestLap")(function* (params: GetFastestLapParams) {
  const resolved = yield* resolveSession({
    year: params.year,
    raceName: params.raceName,
    session: params.session,
    meetingKey: params.meetingKey,
  });
  if (!resolved) return null as number | null;

  const driverNum = resolveDriverNumber(params.driver);
  if (driverNum === undefined) return null as number | null;

  const laps = yield* getOpenF1Laps(resolved.sessionKey, driverNum);

  let bestDuration: number | null = null;
  let bestLap: number | null = null;
  for (const lap of laps) {
    if (lap.lap_duration != null && (bestDuration == null || lap.lap_duration < bestDuration)) {
      bestDuration = lap.lap_duration;
      bestLap = lap.lap_number;
    }
  }

  return bestLap;
});
