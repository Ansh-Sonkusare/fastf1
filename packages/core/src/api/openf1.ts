import { z } from "zod";
import { F1Client } from "../http/client";
import {
  CarDataSchema,
  IntervalSchema,
  LocationSchema,
  MeetingSchema,
  OpenF1DriverSchema,
  OpenF1LapSchema,
  OpenF1PitSchema,
  OvertakeSchema,
  PositionSchema,
  RaceControlSchema,
  SessionResultSchema,
  SessionSchema,
  StartingGridSchema,
  StintSchema,
  TeamRadioSchema,
  WeatherSchema,
} from "../schemas/openf1";

const OPENF1_BASE = "https://api.openf1.org/v1";

function createOpenF1Client() {
  return new F1Client({
    baseUrl: OPENF1_BASE,
    cacheTtlMs: 3600000,
  });
}

const client = createOpenF1Client();

function cleanNulls<T>(obj: T): T {
  if (obj === null) return undefined as T;
  if (Array.isArray(obj))
    return obj.filter((x) => x !== null && x !== undefined).map(cleanNulls) as T;
  if (obj && typeof obj === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      cleaned[key] = cleanNulls(value);
    }
    return cleaned as T;
  }
  return obj;
}

export async function getMeetings(year: number): Promise<z.infer<typeof MeetingSchema>[]> {
  const response = await client.fetch<MeetingSchema[]>(
    `/meetings?year=${year}`,
    {},
    { method: "GET" },
  );
  return z.array(MeetingSchema).parse(cleanNulls(response));
}

export async function getSessions(meetingKey: number): Promise<z.infer<typeof SessionSchema>[]> {
  const response = await client.fetch<SessionSchema[]>(
    `/sessions?meeting_key=${meetingKey}`,
    {},
    { method: "GET" },
  );
  return z.array(SessionSchema).parse(cleanNulls(response));
}

export async function getDrivers(
  sessionKey: number,
): Promise<z.infer<typeof OpenF1DriverSchema>[]> {
  const response = await client.fetch<OpenF1DriverSchema[]>(
    `/drivers?session_key=${sessionKey}`,
    {},
    { method: "GET" },
  );
  return z.array(OpenF1DriverSchema).parse(cleanNulls(response));
}

export async function getOpenF1Laps(
  sessionKey: number,
  driverNumber?: number,
  lapNumber?: number,
): Promise<z.infer<typeof OpenF1LapSchema>[]> {
  const params: Record<string, string | number> = { session_key: sessionKey };
  if (driverNumber) params.driver_number = driverNumber;
  if (lapNumber) params.lap_number = lapNumber;
  // Note: Do NOT add limit param - causes "No results found" on some sessions

  const response = await client.fetch<OpenF1LapSchema[]>("/laps", params, { method: "GET" });
  return z.array(OpenF1LapSchema).parse(cleanNulls(response));
}

export async function getStints(
  sessionKey: number,
  driverNumber?: number,
): Promise<z.infer<typeof StintSchema>[]> {
  const params: Record<string, string | number> = { session_key: sessionKey };
  if (driverNumber) params.driver_number = driverNumber;

  const response = await client.fetch<StintSchema[]>("/stints", params, { method: "GET" });
  return z.array(StintSchema).parse(cleanNulls(response));
}

export async function getPitStops(
  sessionKey: number,
  driverNumber?: number,
): Promise<z.infer<typeof OpenF1PitSchema>[]> {
  const params: Record<string, string | number> = { session_key: sessionKey };
  if (driverNumber) params.driver_number = driverNumber;

  const response = await client.fetch<OpenF1PitSchema[]>("/pit", params, { method: "GET" });
  return z.array(OpenF1PitSchema).parse(cleanNulls(response));
}

export async function getPosition(
  sessionKey: number,
  driverNumber?: number,
): Promise<z.infer<typeof PositionSchema>[]> {
  const params: Record<string, string | number> = { session_key: sessionKey };
  if (driverNumber) params.driver_number = driverNumber;

  const response = await client.fetch<PositionSchema[]>("/position", params, { method: "GET" });
  return z.array(PositionSchema).parse(cleanNulls(response));
}

export async function getCarData(
  sessionKey: number,
  driverNumber?: number,
): Promise<z.infer<typeof CarDataSchema>[]> {
  const params: Record<string, string | number> = { session_key: sessionKey };
  if (driverNumber) params.driver_number = driverNumber;

  const response = await client.fetch<CarDataSchema[]>("/car_data", params, { method: "GET" });
  return z.array(CarDataSchema).parse(cleanNulls(response));
}

export async function getLocation(
  sessionKey: number,
  driverNumber?: number,
): Promise<z.infer<typeof LocationSchema>[]> {
  const params: Record<string, string | number> = { session_key: sessionKey };
  if (driverNumber) params.driver_number = driverNumber;

  const response = await client.fetch<LocationSchema[]>("/location", params, { method: "GET" });
  return z.array(LocationSchema).parse(cleanNulls(response));
}

export async function getWeather(sessionKey: number): Promise<z.infer<typeof WeatherSchema>[]> {
  const response = await client.fetch<WeatherSchema[]>(
    `/weather?session_key=${sessionKey}`,
    {},
    { method: "GET" },
  );
  return z.array(WeatherSchema).parse(cleanNulls(response));
}

export async function getRaceControl(
  sessionKey: number,
): Promise<z.infer<typeof RaceControlSchema>[]> {
  const response = await client.fetch<RaceControlSchema[]>(
    `/race_control?session_key=${sessionKey}`,
    {},
    { method: "GET" },
  );
  return z.array(RaceControlSchema).parse(cleanNulls(response));
}

export async function getTeamRadio(sessionKey: number): Promise<z.infer<typeof TeamRadioSchema>[]> {
  const response = await client.fetch<TeamRadioSchema[]>(
    `/team_radio?session_key=${sessionKey}`,
    {},
    { method: "GET" },
  );
  return z.array(TeamRadioSchema).parse(cleanNulls(response));
}

export async function getOvertakes(sessionKey: number): Promise<z.infer<typeof OvertakeSchema>[]> {
  const response = await client.fetch<OvertakeSchema[]>(
    `/overtakes?session_key=${sessionKey}`,
    {},
    { method: "GET" },
  );
  return z.array(OvertakeSchema).parse(cleanNulls(response));
}

export async function getSessionResult(
  sessionKey: number,
): Promise<z.infer<typeof SessionResultSchema>[]> {
  const response = await client.fetch<SessionResultSchema[]>(
    `/session_result?session_key=${sessionKey}`,
    {},
    { method: "GET" },
  );
  return z.array(SessionResultSchema).parse(cleanNulls(response));
}

export async function getStartingGrid(
  sessionKey: number,
): Promise<z.infer<typeof StartingGridSchema>[]> {
  const response = await client.fetch<StartingGridSchema[]>(
    `/starting_grid?session_key=${sessionKey}`,
    {},
    { method: "GET" },
  );
  return z.array(StartingGridSchema).parse(cleanNulls(response));
}

export async function getIntervals(sessionKey: number): Promise<z.infer<typeof IntervalSchema>[]> {
  const response = await client.fetch<IntervalSchema[]>(
    `/intervals?session_key=${sessionKey}`,
    {},
    { method: "GET" },
  );
  return z.array(IntervalSchema).parse(cleanNulls(response));
}
