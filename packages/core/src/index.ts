export {
  F1ClientService,
  F1ClientServiceLive,
} from "./http/service";
export type { F1ClientServiceShape, ClientError } from "./http/service";

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
export { getPitStops } from "./api/pitstops";
export { getCircuitInfo } from "./api/circuits";
export { getDriverCareer } from "./api/drivers";
export { toPromise } from "./api/promises";

export {
  getMeetings,
  getSessions,
  getDrivers,
  getOpenF1Laps,
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
  setOpenF1BaseUrl,
  getOpenF1BaseUrl,
  clearOpenF1Cache,
  setOpenF1CacheEnabled,
} from "./api/openf1";

export type {
  Meeting,
  Session,
  OpenF1Driver,
  OpenF1Lap,
  CarData,
  Stint,
  OpenF1Pit,
  Position,
  OpenF1Location,
  Weather,
  RaceControl,
  TeamRadio,
  Overtake,
  SessionResult,
  StartingGrid,
  Interval,
} from "./schemas/openf1";
export { cleanNulls } from "./utils";

export {
  filterByDriver,
  filterRaceLaps,
  getFastestLap as getAnalysisFastestLap,
  getSectorBest,
  getTyreDegradation,
  getStintPace,
  getDriverConsistency,
  getRaceDeltas,
  getPitStopAnalysis,
  getPositionChanges,
  compareDrivers,
  compareStints,
  type StintData,
} from "./utils/analysis";

export {
  getRace,
  getSession,
  getLaps as getSessionLaps,
  getDrivers as getSessionDrivers,
  getStints as sessionStints,
  getPositions,
  getRaceStints,
  getRacePitStops,
  getRaceWeather,
  getRaceTelemetry,
  getFastestLap,
} from "./api/friendly";

export type {
  GetRaceParams,
  GetSessionParams,
  GetLapsParams,
  GetRaceStintsParams,
  GetRacePitStopsParams,
  GetRaceWeatherParams,
  GetRaceTelemetryParams,
  GetFastestLapParams,
} from "./api/friendly";

export {
  DRIVER_CODES,
  resolveMeeting,
  resolveSession,
  resolveDriverNumber,
  resolveTelemetryLapWindow,
} from "./api/race-session";

export type {
  ResolveMeetingParams,
  ResolveSessionParams,
  ResolvedSession,
  TelemetryLapWindow,
  TelemetryLapWindowOptions,
} from "./api/race-session";
