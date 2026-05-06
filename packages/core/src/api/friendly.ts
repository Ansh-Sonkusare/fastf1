import type { z } from "zod";
import { F1Client } from "../http/client";
import type {
  MeetingSchema,
  OpenF1DriverSchema,
  OpenF1LapSchema,
  PositionSchema,
  SessionSchema,
  StintSchema,
} from "../schemas/openf1";
import type { Meeting, OpenF1Lap, Position, Session, Stint } from "../schemas/openf1";
import { cleanNulls } from "../utils";

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

export interface GetRaceParams {
  year: number;
  name?: string;
  round?: number;
}

export async function getRace(params: GetRaceParams): Promise<Meeting | null> {
  const meetings = await client.get<z.infer<typeof MeetingSchema>>("meetings", {
    year: params.year,
  });

  if (!meetings || meetings.length === 0) return null;

  const filtered = params.name
    ? meetings.filter(
        (m) =>
          m.meeting_name?.toLowerCase().includes(params.name?.toLowerCase()) ||
          m.meeting_official_name?.toLowerCase().includes(params.name?.toLowerCase()),
      )
    : params.round
      ? meetings.filter((m) => m.meeting_round === params.round)
      : meetings;

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

  const sessions = await client.get<z.infer<typeof SessionSchema>>("sessions", {
    meeting_key: race.meeting_key,
  });

  if (!sessions || sessions.length === 0) return null;

  if (!params.session) return sessions[0];

  const sessionTypes: Record<string, string[]> = {
    practice: ["Practice 1", "Practice 2", "Practice 3"],
    qualifying: ["Qualifying", "Qualifying Spell", "Sprint Qualifying"],
    sprint: ["Sprint", "Sprint Shootout", "Sprint Race"],
    race: ["Race", "Main Race"],
  };

  const targetTypes = sessionTypes[params.session.toLowerCase()] ?? [params.session];

  const filtered = sessions.filter((s) =>
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

  return client.get<z.infer<typeof OpenF1LapSchema>>("laps", cleanNulls(query));
}

export async function getDrivers(
  sessionKey: number,
): Promise<{ driver_number: number; full_name: string; team_name: string }[]> {
  return client.get<z.infer<typeof OpenF1DriverSchema>>("drivers", { session_key: sessionKey });
}

export async function getStints(sessionKey: number): Promise<Stint[]> {
  return client.get<z.infer<typeof StintSchema>>("stints", { session_key: sessionKey });
}

export async function getPositions(sessionKey: number): Promise<Position[]> {
  return client.get<z.infer<typeof PositionSchema>>("positions", { session_key: sessionKey });
}
