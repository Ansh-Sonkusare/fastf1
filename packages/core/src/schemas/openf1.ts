import { Schema } from "effect";

const nullish = <A, I, R>(schema: Schema.Schema<A, I, R>) =>
  Schema.optionalWith(schema, { nullable: true, exact: true });

export const MeetingSchema = Schema.Struct({
  meeting_key: Schema.Number,
  meeting_name: Schema.String,
  meeting_official_name: Schema.String,
  meeting_round: nullish(Schema.Number),
  year: Schema.Number,
  circuit_key: Schema.Number,
  circuit_short_name: Schema.String,
  circuit_type: Schema.String,
  country_key: Schema.Number,
  country_name: Schema.String,
  country_code: Schema.String,
  country_flag: nullish(Schema.String),
  location: Schema.String,
  date_start: Schema.String,
  date_end: Schema.String,
  gmt_offset: Schema.String,
  is_cancelled: nullish(Schema.Boolean),
});
export type Meeting = Schema.Schema.Type<typeof MeetingSchema>;

export const SessionSchema = Schema.Struct({
  session_key: Schema.Number,
  meeting_key: Schema.Number,
  session_name: Schema.String,
  session_type: Schema.String,
  year: Schema.Number,
  country_key: Schema.Number,
  country_name: Schema.String,
  country_code: nullish(Schema.String),
  circuit_key: Schema.Number,
  circuit_short_name: Schema.String,
  location: Schema.String,
  date_start: Schema.String,
  date_end: Schema.String,
  gmt_offset: Schema.String,
  is_cancelled: nullish(Schema.Boolean),
});
export type Session = Schema.Schema.Type<typeof SessionSchema>;

export const OpenF1DriverSchema = Schema.Struct({
  session_key: Schema.Number,
  meeting_key: Schema.Number,
  driver_number: Schema.Number,
  broadcast_name: Schema.String,
  full_name: Schema.String,
  first_name: Schema.String,
  last_name: Schema.String,
  name_acronym: Schema.String,
  team_name: Schema.String,
  team_colour: Schema.String,
  headshot_url: nullish(Schema.String),
});
export type OpenF1Driver = Schema.Schema.Type<typeof OpenF1DriverSchema>;

export const OpenF1LapSchema = Schema.Struct({
  session_key: Schema.Number,
  meeting_key: Schema.Number,
  driver_number: Schema.Number,
  lap_number: Schema.Number,
  date_start: nullish(Schema.String),
  lap_duration: nullish(Schema.Number),
  duration_sector_1: nullish(Schema.Number),
  duration_sector_2: nullish(Schema.Number),
  duration_sector_3: nullish(Schema.Number),
  i1_speed: nullish(Schema.Number),
  i2_speed: nullish(Schema.Number),
  st_speed: nullish(Schema.Number),
  is_pit_out_lap: nullish(Schema.Boolean),
  segments_sector_1: nullish(Schema.Array(Schema.Union(Schema.Number, Schema.Null))),
  segments_sector_2: nullish(Schema.Array(Schema.Union(Schema.Number, Schema.Null))),
  segments_sector_3: nullish(Schema.Array(Schema.Union(Schema.Number, Schema.Null))),
});
export type OpenF1Lap = Schema.Schema.Type<typeof OpenF1LapSchema>;

export const StintSchema = Schema.Struct({
  session_key: Schema.Number,
  meeting_key: Schema.Number,
  driver_number: Schema.Number,
  stint_number: Schema.Number,
  lap_start: Schema.Number,
  lap_end: Schema.Number,
  compound: Schema.String,
  tyre_age_at_start: nullish(Schema.Number),
});
export type Stint = Schema.Schema.Type<typeof StintSchema>;

export const OpenF1PitSchema = Schema.Struct({
  session_key: Schema.Number,
  meeting_key: Schema.Number,
  driver_number: Schema.Number,
  lap_number: nullish(Schema.Number),
  stop_number: nullish(Schema.Number),
  pit_duration: nullish(Schema.Number),
  lane_duration: nullish(Schema.Number),
  stop_duration: nullish(Schema.Number),
  date: nullish(Schema.String),
});
export type OpenF1Pit = Schema.Schema.Type<typeof OpenF1PitSchema>;

export const PositionSchema = Schema.Struct({
  session_key: Schema.Number,
  meeting_key: Schema.Number,
  driver_number: Schema.Number,
  position: Schema.Number,
  date: Schema.String,
});
export type Position = Schema.Schema.Type<typeof PositionSchema>;

export const CarDataSchema = Schema.Struct({
  session_key: Schema.Number,
  meeting_key: Schema.Number,
  driver_number: Schema.Number,
  date: Schema.String,
  speed: nullish(Schema.Number),
  rpm: nullish(Schema.Number),
  n_gear: nullish(Schema.Number),
  throttle: nullish(Schema.Number),
  brake: nullish(Schema.Number),
  drs: nullish(Schema.Number),
});
export type CarData = Schema.Schema.Type<typeof CarDataSchema>;

export const LocationSchema = Schema.Struct({
  session_key: Schema.Number,
  meeting_key: Schema.Number,
  driver_number: Schema.Number,
  date: Schema.String,
  x: Schema.Number,
  y: Schema.Number,
  z: nullish(Schema.Number),
});
export type OpenF1Location = Schema.Schema.Type<typeof LocationSchema>;

export const WeatherSchema = Schema.Struct({
  session_key: Schema.Number,
  meeting_key: Schema.Number,
  date: Schema.String,
  air_temperature: nullish(Schema.Number),
  track_temperature: nullish(Schema.Number),
  humidity: nullish(Schema.Number),
  pressure: nullish(Schema.Number),
  wind_speed: nullish(Schema.Number),
  wind_direction: nullish(Schema.Number),
  precipitation: nullish(Schema.Number),
  track_surface_temperature: nullish(Schema.Number),
});
export type Weather = Schema.Schema.Type<typeof WeatherSchema>;

export const RaceControlSchema = Schema.Struct({
  session_key: Schema.Number,
  meeting_key: Schema.Number,
  date: Schema.String,
  category: Schema.String,
  flag: nullish(Schema.String),
  scope: nullish(Schema.String),
  sector: nullish(Schema.Number),
  lap_number: nullish(Schema.Number),
  driver_number: nullish(Schema.Number),
  message: Schema.String,
  qualifying_phase: nullish(Schema.String),
});
export type RaceControl = Schema.Schema.Type<typeof RaceControlSchema>;

export const TeamRadioSchema = Schema.Struct({
  session_key: Schema.Number,
  meeting_key: Schema.Number,
  driver_number: Schema.Number,
  date: Schema.String,
  message: Schema.String,
  driver_id: Schema.String,
});
export type TeamRadio = Schema.Schema.Type<typeof TeamRadioSchema>;

export const OvertakeSchema = Schema.Struct({
  session_key: Schema.Number,
  meeting_key: Schema.Number,
  date: Schema.String,
  overtaking_driver_number: Schema.Number,
  overtaken_driver_number: Schema.Number,
  position: Schema.Number,
});
export type Overtake = Schema.Schema.Type<typeof OvertakeSchema>;

export const SessionResultSchema = Schema.Struct({
  session_key: Schema.Number,
  meeting_key: Schema.Number,
  driver_number: Schema.Number,
  position: Schema.Number,
  duration: nullish(Schema.Number),
  gap_to_leader: nullish(Schema.Number),
  number_of_laps: Schema.Number,
  dnf: Schema.Boolean,
  dns: Schema.Boolean,
  dsq: Schema.Boolean,
});
export type SessionResult = Schema.Schema.Type<typeof SessionResultSchema>;

export const StartingGridSchema = Schema.Struct({
  session_key: Schema.Number,
  meeting_key: Schema.Number,
  driver_number: Schema.Number,
  position: Schema.Number,
  lap_duration: nullish(Schema.Number),
});
export type StartingGrid = Schema.Schema.Type<typeof StartingGridSchema>;

export const IntervalSchema = Schema.Struct({
  session_key: Schema.Number,
  meeting_key: Schema.Number,
  driver_number: Schema.Number,
  date: Schema.String,
  gap_to_leader: nullish(Schema.Number),
  interval: nullish(Schema.Number),
});
export type Interval = Schema.Schema.Type<typeof IntervalSchema>;
