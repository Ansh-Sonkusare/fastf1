import { Effect } from "effect";
import type { CarData, Meeting, OpenF1Lap, Session } from "../schemas/openf1";
import { getCarData, getMeetings, getOpenF1Laps, getSessions } from "./openf1";

export const DRIVER_CODES: Readonly<Record<string, number>> = {
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

export interface ResolveMeetingParams {
  readonly year: number;
  readonly name?: string;
  readonly round?: number;
}

export const resolveMeeting = Effect.fn("resolveMeeting")(function* (params: ResolveMeetingParams) {
  const meetings = yield* getMeetings(params.year);
  if (!meetings || meetings.length === 0) return null as Meeting | null;

  const name = params.name?.toLowerCase();
  let filtered = name
    ? meetings.filter(
        (m) =>
          m.meeting_name?.toLowerCase().includes(name) ||
          m.meeting_official_name?.toLowerCase().includes(name),
      )
    : meetings;

  if (params.round !== undefined) {
    filtered = filtered.filter((m) => m.meeting_round === params.round);
  }

  return filtered[0] ?? null;
});

export interface ResolveSessionParams {
  readonly year: number;
  readonly raceName?: string;
  readonly round?: number;
  readonly session?: string;
  readonly sessionKey?: number;
  readonly meetingKey?: number;
}

export interface ResolvedSession {
  readonly session: Session | null;
  readonly meeting: Meeting | null;
  readonly sessionKey: number;
}

const SESSION_TYPES: Readonly<Record<string, readonly string[]>> = {
  practice: ["Practice 1", "Practice 2", "Practice 3"],
  qualifying: ["Qualifying", "Qualifying Spell", "Sprint Qualifying"],
  sprint: ["Sprint", "Sprint Shootout", "Sprint Race"],
  race: ["Race", "Main Race"],
};

export const resolveSession = Effect.fn("resolveSession")(function* (params: ResolveSessionParams) {
  if (params.sessionKey !== undefined) {
    return {
      session: null as Session | null,
      meeting: null as Meeting | null,
      sessionKey: params.sessionKey,
    };
  }

  let meeting: Meeting | null = null;
  let meetingKey = params.meetingKey;

  if (meetingKey === undefined) {
    meeting = yield* resolveMeeting({
      year: params.year,
      name: params.raceName,
      round: params.round,
    });
    if (!meeting) return null as ResolvedSession | null;
    meetingKey = meeting.meeting_key;
  }

  const sessions = yield* getSessions(meetingKey);
  if (!sessions || sessions.length === 0) return null as ResolvedSession | null;

  let session: Session | null = null;
  if (!params.session) {
    session = sessions.find((s) => s.session_type?.toLowerCase() === "race") ?? sessions[0] ?? null;
  } else {
    const sessionQuery = params.session;
    const targetTypes = SESSION_TYPES[sessionQuery.toLowerCase()] ?? [sessionQuery];
    session =
      sessions.find((s) =>
        targetTypes.some((t) => s.session_name?.toLowerCase().includes(t.toLowerCase())),
      ) ?? null;
  }

  if (!session) return null as ResolvedSession | null;

  return { session, meeting, sessionKey: session.session_key };
});

export function resolveDriverNumber(driver: string | number | undefined): number | undefined {
  if (driver === undefined) return undefined;
  if (typeof driver === "number") return driver;
  const mapped = DRIVER_CODES[driver.toUpperCase()];
  if (mapped !== undefined) return mapped;
  const parsed = Number(driver);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export interface TelemetryLapWindowOptions {
  readonly lap?: number;
  readonly lapStart?: number;
  readonly lapEnd?: number;
}

export interface TelemetryLapWindow {
  readonly sessionKey: number;
  readonly driverNumber: number | undefined;
  readonly laps: readonly OpenF1Lap[];
  readonly carData: readonly CarData[];
}

type DatedLap = OpenF1Lap & { readonly date_start: string };

function lapDateBounds(laps: readonly OpenF1Lap[]): {
  readonly dateGt?: string;
  readonly dateLt?: string;
} {
  const dated = laps.filter((lap): lap is DatedLap => lap.date_start !== undefined);
  if (dated.length === 0) return {};
  const sorted = [...dated].sort((a, b) => a.date_start.localeCompare(b.date_start));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const dateGt = first.date_start;
  let dateLt: string | undefined;
  if (last.lap_duration !== undefined) {
    const end = Date.parse(last.date_start) + last.lap_duration * 1000;
    dateLt = new Date(end).toISOString();
  }
  return { dateGt, dateLt };
}

export const resolveTelemetryLapWindow = Effect.fn("resolveTelemetryLapWindow")(function* (
  sessionKey: number,
  driver: string | number,
  opts?: TelemetryLapWindowOptions,
) {
  const driverNumber = resolveDriverNumber(driver);
  const { lap, lapStart, lapEnd } = opts ?? {};
  const hasLapConstraint = lap !== undefined || lapStart !== undefined || lapEnd !== undefined;

  let laps: readonly OpenF1Lap[] = [];
  if (hasLapConstraint) {
    if (lap !== undefined) {
      laps = yield* getOpenF1Laps(sessionKey, driverNumber, lap);
    } else {
      const allLaps = yield* getOpenF1Laps(sessionKey, driverNumber);
      laps = allLaps.filter(
        (l) =>
          (lapStart === undefined || l.lap_number >= lapStart) &&
          (lapEnd === undefined || l.lap_number <= lapEnd),
      );
    }
  }

  const bounds = hasLapConstraint ? lapDateBounds(laps) : {};
  const carData = yield* bounds.dateGt !== undefined || bounds.dateLt !== undefined
    ? getCarData(sessionKey, driverNumber, bounds)
    : getCarData(sessionKey, driverNumber);

  return { sessionKey, driverNumber, laps, carData };
});
