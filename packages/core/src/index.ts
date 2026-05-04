export { F1Client } from "./http/client";
export {
  F1ClientError,
  TimeoutError,
  RateLimitError,
  AbortError,
} from "./http/errors";
export type { ClientOptions } from "./http/client";

export {
  SeasonSchema,
  RaceSchema,
  CircuitSchema,
  LocationSchema,
  SessionDateTimeSchema,
  RaceTableSchema,
  ScheduleResponseSchema,
} from "./schemas/race";
export type {
  Season,
  Race,
  Circuit,
  Location,
  SessionDateTime,
  RaceTable,
  ScheduleResponse,
} from "./schemas/race";

export {
  DriverSchema,
  ConstructorSchema,
  TeamSchema,
  DriverStandingSchema,
  ConstructorStandingSchema,
} from "./schemas/participants";
export type {
  Driver,
  Constructor,
  Team,
  DriverStanding,
  ConstructorStanding,
} from "./schemas/participants";

export {
  LapSchema,
  PitStopSchema,
  TimingSchema,
  FastestLapSchema,
} from "./schemas/timing";
export type {
  Lap,
  PitStop,
  Timing,
  FastestLap,
} from "./schemas/timing";

export {
  QualifyingResultSchema,
  RaceResultSchema,
  SprintResultSchema,
} from "./schemas/results";
export type {
  QualifyingResult,
  RaceResult,
  SprintResult,
} from "./schemas/results";

export { getSchedule } from "./api/schedule";
export { getRaceResults } from "./api/results";
export type { ResultType } from "./api/results";
export { getDriverStandings, getConstructorStandings } from "./api/standings";
export { getLaps } from "./api/laps";

export {
  getMeetings,
  getSessions,
  getDrivers,
  getLaps as getOpenF1Laps,
  getStints,
  getPitStops as getOpenF1PitStops,
  getPosition,
  getCarData,
  getLocation,
  getWeather,
  getRaceControl,
  getTeamRadio,
  getOvertakes,
  getSessionResult,
  getStartingGrid,
  getIntervals,
} from "./api/openf1";
