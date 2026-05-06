import { F1Client } from "../http/client";
import type {
  CarData,
  Meeting,
  OpenF1Driver,
  OpenF1Lap,
  OpenF1Pit,
  Position,
  Session,
  Stint,
  Weather,
} from "../schemas/openf1";

const OPENF1_BASE = "https://api.openf1.org/v1";

const DRIVER_CODES: Record<string, number> = {
  VER: 1,
  PER: 2,
  LEC: 4,
  HAM: 44,
  RUS: 63,
  ALO: 14,
  OCO: 18,
  GAS: 23,
  ALB: 21,
  ZHO: 24,
  BOT: 88,
  MAG: 47,
  NOR: 34,
  KUB: 64,
  PIA: 81,
  COL: 87,
  TSU: 22,
  RIC: 3,
  DEV: 16,
  SAR: 43,
  BEA: 72,
  DOO: 76,
  LAW: 73,
  HAD: 98,
  ARA: 89,
};

const client = new F1Client({ baseUrl: OPENF1_BASE });

function cleanNulls(obj: Record<string, unknown>): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value != null) {
      if (typeof value === "string" || typeof value === "number") {
        result[key] = value;
      }
    }
  }
  return result;
}

export interface GetRaceParams {
  year: number;
  name?: string;
  round?: number;
}

export async function getRace(params: GetRaceParams): Promise<Meeting | null> {
  const meetings = await client.get<Meeting[]>("meetings", { year: params.year });

  if (!meetings || !Array.isArray(meetings) || meetings.length === 0) return null;

  const list = meetings;
  const filtered = params.name
    ? list.filter(
        (m: Meeting) =>
          (params.name && m.meeting_name?.toLowerCase().includes(params.name.toLowerCase())) ||
          (params.name &&
            m.meeting_official_name?.toLowerCase().includes(params.name.toLowerCase())),
      )
    : params.round
      ? list.filter(
          (m: Meeting) =>
            (m as Meeting & { meeting_round?: number }).meeting_round === params.round,
        )
      : list;

  return filtered[0] ?? null;
}

export interface GetSessionParams {
  year: number;
  raceName?: string;
  round?: number;
  session?: string;
}

export async function getSession(params: GetSessionParams): Promise<Session | null> {
  const race = await getRace({ year: params.year, name: params.raceName, round: params.round });
  if (!race) return null;

  const sessions = await client.get<Session[]>("sessions", { meeting_key: race.meeting_key });

  if (!sessions || !Array.isArray(sessions) || sessions.length === 0) return null;

  if (!params.session) return sessions[0];

  const sessionTypes: Record<string, string[]> = {
    practice: ["Practice 1", "Practice 2", "Practice 3"],
    qualifying: ["Qualifying", "Qualifying Spell", "Sprint Qualifying"],
    sprint: ["Sprint", "Sprint Shootout", "Sprint Race"],
    race: ["Race", "Main Race"],
  };

  const targetTypes = sessionTypes[params.session.toLowerCase()] ?? [params.session];

  const filtered = sessions.filter((s: Session) =>
    targetTypes.some((t) => s.session_name?.toLowerCase().includes(t.toLowerCase())),
  );

  return filtered[0] ?? null;
}

export interface GetLapsParams {
  year: number;
  raceName?: string;
  round?: number;
  driver?: string | number;
  lap?: number;
  sessionKey?: number;
}

export async function getLaps(params: GetLapsParams): Promise<OpenF1Lap[]> {
  const query: Record<string, unknown> = {};

  if (params.sessionKey) {
    query.session_key = params.sessionKey;
  } else {
    const session = await getSession({
      year: params.year,
      raceName: params.raceName,
      round: params.round,
    });
    if (!session) return [];
    query.session_key = session.session_key;
  }

  if (params.driver) {
    query.driver_number =
      typeof params.driver === "number"
        ? params.driver
        : (DRIVER_CODES[params.driver.toUpperCase()] ?? params.driver);
  }

  if (params.lap) query.lap_number = params.lap;

  return client.get<OpenF1Lap[]>("laps", cleanNulls(query));
}

export async function getDrivers(
  sessionKey: number,
): Promise<{ driver_number: number; full_name: string; team_name: string }[]> {
  return client.get<OpenF1Driver[]>("drivers", { session_key: sessionKey });
}

export async function getStints(sessionKey: number): Promise<Stint[]> {
  return client.get<Stint[]>("stints", { session_key: sessionKey });
}

export async function getPositions(sessionKey: number): Promise<Position[]> {
  return client.get<Position[]>("positions", { session_key: sessionKey });
}

export interface GetRaceStintsParams {
  year: number;
  raceName?: string;
  round?: number;
  driver?: string | number;
  sessionKey?: number;
}

export async function getRaceStints(params: GetRaceStintsParams): Promise<Stint[]> {
  let sessionKey = params.sessionKey;

  if (!sessionKey) {
    const session = await getSession({
      year: params.year,
      raceName: params.raceName,
      round: params.round,
    });
    if (!session) return [];
    sessionKey = session.session_key;
  }

  const stints = await getStints(sessionKey);

  if (params.driver) {
    const driverNum =
      typeof params.driver === "number"
        ? params.driver
        : (DRIVER_CODES[params.driver.toUpperCase()] ?? Number(params.driver));
    return stints.filter((s) => Number(s.driver_number) === driverNum);
  }

  return stints;
}

export async function getPitStops(sessionKey: number, driverNumber?: number): Promise<OpenF1Pit[]> {
  const params: Record<string, unknown> = { session_key: sessionKey };
  if (driverNumber) params.driver_number = driverNumber;

  const response = await client.fetch<OpenF1Pit[]>("/pit", cleanNulls(params), {
    method: "GET",
  });
  return response;
}

export async function getWeather(sessionKey: number): Promise<Weather[]> {
  return client.get<Weather[]>("weather", { session_key: sessionKey });
}

export async function getCarData(sessionKey: number, driverNumber?: number): Promise<CarData[]> {
  const params: Record<string, unknown> = { session_key: sessionKey };
  if (driverNumber) params.driver_number = driverNumber;

  return client.get<CarData[]>("car_data", cleanNulls(params));
}

export interface GetRacePitStopsParams {
  year: number;
  raceName?: string;
  round?: number;
  driver?: string | number;
  sessionKey?: number;
}

export async function getRacePitStops(params: GetRacePitStopsParams): Promise<OpenF1Pit[]> {
  let sessionKey = params.sessionKey;

  if (!sessionKey) {
    const session = await getSession({
      year: params.year,
      raceName: params.raceName,
      round: params.round,
    });
    if (!session) return [];
    sessionKey = session.session_key;
  }

  const pits = params.driver
    ? await getPitStops(
        sessionKey,
        typeof params.driver === "number"
          ? params.driver
          : (DRIVER_CODES[params.driver.toUpperCase()] ?? Number(params.driver)),
      )
    : await getPitStops(sessionKey);

  return pits;
}

export interface GetRaceWeatherParams {
  year: number;
  raceName?: string;
  round?: number;
  sessionKey?: number;
}

export async function getRaceWeather(params: GetRaceWeatherParams): Promise<Weather[]> {
  let sessionKey = params.sessionKey;

  if (!sessionKey) {
    const session = await getSession({
      year: params.year,
      raceName: params.raceName,
      round: params.round,
    });
    if (!session) return [];
    sessionKey = session.session_key;
  }

  return getWeather(sessionKey);
}

export interface GetRaceTelemetryParams {
  year: number;
  raceName?: string;
  round?: number;
  driver: string | number;
  sessionKey?: number;
}

export async function getRaceTelemetry(params: GetRaceTelemetryParams): Promise<CarData[]> {
  let sessionKey = params.sessionKey;

  if (!sessionKey) {
    const session = await getSession({
      year: params.year,
      raceName: params.raceName,
      round: params.round,
    });
    if (!session) return [];
    sessionKey = session.session_key;
  }

  const driverNum =
    typeof params.driver === "number"
      ? params.driver
      : (DRIVER_CODES[params.driver.toUpperCase()] ?? params.driver);

  return getCarData(sessionKey, driverNum);
}
