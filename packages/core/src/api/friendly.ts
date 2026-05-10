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
  LEC: 16,
  HAM: 44,
  NOR: 4,
  RUS: 63,
  ALO: 14,
  GAS: 10,
  TSU: 22,
  BOT: 87,
  MAG: 27,
  ALB: 23,
  ZHO: 24,
  COL: 43,
  LAW: 30,
  PIA: 81,
  ARI: 21,
  DEV: 99,
  STR: 11,
  BEA: 5,
  DOO: 87,
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
  meetingKey?: number;
  driver?: string | number;
  session?: string;
  sessionKey?: number;
}

export async function getRaceStints(params: GetRaceStintsParams): Promise<Stint[]> {
  let sessionKey = params.sessionKey;

  if (!sessionKey && params.meetingKey) {
    const sessions = await client.get<Session[]>("sessions", { meeting_key: params.meetingKey });
    if (!sessions?.length) return [];
    const target = params.session
      ? sessions.find((s) => s.session_name?.toLowerCase().includes(params.session!.toLowerCase()))
      : sessions.find((s) => s.session_type === "Race");
    sessionKey = target?.session_key;
    if (!sessionKey) return [];
  }

  if (!sessionKey) {
    const session = await getSession({
      year: params.year,
      raceName: params.raceName,
      round: params.round,
      session: params.session,
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

export async function getCarData(
  sessionKey: number,
  driverNumber?: number,
  minDate?: string,
  maxDate?: string,
): Promise<CarData[]> {
  const params: Record<string, unknown> = { session_key: sessionKey };
  if (driverNumber) params.driver_number = driverNumber;
  if (minDate) params["date>"] = minDate;
  if (maxDate) params["date<"] = maxDate;

  return client.get<CarData[]>("car_data", cleanNulls(params));
}

export interface GetRacePitStopsParams {
  year: number;
  raceName?: string;
  round?: number;
  meetingKey?: number;
  driver?: string | number;
  session?: string;
  sessionKey?: number;
}

export async function getRacePitStops(params: GetRacePitStopsParams): Promise<OpenF1Pit[]> {
  let sessionKey = params.sessionKey;

  if (!sessionKey && params.meetingKey) {
    const sessions = await client.get<Session[]>("sessions", { meeting_key: params.meetingKey });
    if (!sessions?.length) return [];
    const target = params.session
      ? sessions.find((s) => s.session_name?.toLowerCase().includes(params.session!.toLowerCase()))
      : sessions.find((s) => s.session_type === "Race");
    sessionKey = target?.session_key;
    if (!sessionKey) return [];
  }

  if (!sessionKey) {
    const session = await getSession({
      year: params.year,
      raceName: params.raceName,
      round: params.round,
      session: params.session,
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
  meetingKey?: number;
  session?: string;
  sessionKey?: number;
}

export async function getRaceWeather(params: GetRaceWeatherParams): Promise<Weather[]> {
  let sessionKey = params.sessionKey;

  if (!sessionKey && params.meetingKey) {
    const sessions = await client.get<Session[]>("sessions", { meeting_key: params.meetingKey });
    if (!sessions?.length) return [];
    const target = params.session
      ? sessions.find((s) => s.session_name?.toLowerCase().includes(params.session!.toLowerCase()))
      : sessions.find((s) => s.session_type === "Race");
    sessionKey = target?.session_key;
    if (!sessionKey) return [];
  }

  if (!sessionKey) {
    const session = await getSession({
      year: params.year,
      raceName: params.raceName,
      round: params.round,
      session: params.session,
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
  meetingKey?: number;
  driver: string | number;
  session?: string;
  sessionKey?: number;
  lap?: number;
}

export async function getRaceTelemetry(params: GetRaceTelemetryParams): Promise<CarData[]> {
  let sessionKey = params.sessionKey;

  if (!sessionKey && params.meetingKey) {
    const sessions = await client.get<Session[]>("sessions", { meeting_key: params.meetingKey });
    if (!sessions?.length) return [];
    const target = params.session
      ? sessions.find((s) => s.session_name?.toLowerCase().includes(params.session!.toLowerCase()))
      : sessions.find((s) => s.session_type === "Race");
    sessionKey = target?.session_key;
    if (!sessionKey) return [];
  }

  if (!sessionKey) {
    const session = await getSession({
      year: params.year,
      raceName: params.raceName,
      round: params.round,
      session: params.session,
    });
    if (!session) return [];
    sessionKey = session.session_key;
  }

  const driverNum =
    typeof params.driver === "number"
      ? params.driver
      : (DRIVER_CODES[params.driver.toUpperCase()] ?? params.driver);

  let data: CarData[];

  if (params.lap) {
    const laps = await client.get<{ lap_number: number; date_start: string }[]>("laps", {
      session_key: sessionKey,
      driver_number: driverNum,
    });
    const lapNum = params.lap;
    const targetLap = laps.find((l) => l.lap_number === lapNum);
    if (targetLap) {
      const nextLap = laps.find((l) => l.lap_number === lapNum + 1);
      const allData = await getCarData(sessionKey, driverNum, targetLap.date_start);
      const start = new Date(targetLap.date_start).getTime();
      const end = nextLap ? new Date(nextLap.date_start).getTime() : start + 120000;
      data = allData.filter((d) => {
        const dTime = new Date(d.date).getTime();
        return dTime >= start && dTime < end;
      });
    } else {
      data = [];
    }
  } else {
    data = await getCarData(sessionKey, driverNum);
  }

  return data;
}

export interface GetFastestLapParams {
  year: number;
  raceName?: string;
  meetingKey?: number;
  driver?: string | number;
  session?: string;
}

export async function getFastestLap(params: GetFastestLapParams): Promise<number | null> {
  let sessionKey: number | undefined;

  if (params.meetingKey) {
    const sessions = await client.get<Session[]>("sessions", { meeting_key: params.meetingKey });
    if (!sessions?.length) return null;
    const target = params.session
      ? sessions.find((s) => s.session_name?.toLowerCase().includes(params.session!.toLowerCase()))
      : sessions.find((s) => s.session_type === "Race");
    sessionKey = target?.session_key;
  } else {
    const session = await getSession({
      year: params.year,
      raceName: params.raceName,
      session: params.session,
    });
    sessionKey = session?.session_key;
  }

  if (!sessionKey) return null;

  const driverNum =
    typeof params.driver === "number"
      ? params.driver
      : (DRIVER_CODES[params.driver?.toUpperCase() ?? ""] ?? params.driver);

  const laps = await client.get<{ lap_number: number; lap_duration: number | null }[]>("laps", {
    session_key: sessionKey,
    driver_number: driverNum,
  });

  let bestDuration: number | null = null;
  let bestLap: number | null = null;
  for (const lap of laps) {
    if (lap.lap_duration != null && (bestDuration == null || lap.lap_duration < bestDuration)) {
      bestDuration = lap.lap_duration;
      bestLap = lap.lap_number;
    }
  }

  return bestLap;
}
