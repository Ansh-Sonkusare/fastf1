import { z } from "zod";

export const MeetingSchema = z.object({
  meeting_key: z.number(),
  meeting_name: z.string(),
  meeting_official_name: z.string(),
  year: z.number(),
  circuit_key: z.number(),
  circuit_short_name: z.string(),
  circuit_type: z.string(),
  country_key: z.number(),
  country_name: z.string(),
  country_code: z.string(),
  country_flag: z.string().optional(),
  location: z.string(),
  date_start: z.string(),
  date_end: z.string(),
  gmt_offset: z.string(),
  is_cancelled: z.boolean().optional(),
});

export type Meeting = z.infer<typeof MeetingSchema>;

export const SessionSchema = z.object({
  session_key: z.number(),
  meeting_key: z.number(),
  session_name: z.string(),
  session_type: z.string(),
  year: z.number(),
  country_key: z.number(),
  country_name: z.string(),
  circuit_key: z.number(),
  circuit_short_name: z.string(),
  location: z.string(),
  date_start: z.string(),
  date_end: z.string(),
  gmt_offset: z.string(),
  is_cancelled: z.boolean().optional(),
});

export type Session = z.infer<typeof SessionSchema>;

export const OpenF1DriverSchema = z.object({
  session_key: z.number(),
  meeting_key: z.number(),
  driver_number: z.number(),
  broadcast_name: z.string(),
  full_name: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  name_acronym: z.string(),
  team_name: z.string(),
  team_colour: z.string(),
  headshot_url: z.string().optional(),
});

export type OpenF1Driver = z.infer<typeof OpenF1DriverSchema>;

export const OpenF1LapSchema = z.object({
  session_key: z.number(),
  meeting_key: z.number(),
  driver_number: z.number(),
  lap_number: z.number(),
  date_start: z.string(),
  lap_duration: z.number().nullish(),
  duration_sector_1: z.number().nullish(),
  duration_sector_2: z.number().nullish(),
  duration_sector_3: z.number().nullish(),
  i1_speed: z.number().nullish(),
  i2_speed: z.number().nullish(),
  st_speed: z.number().nullish(),
  is_pit_out_lap: z.boolean().optional(),
  segments_sector_1: z.array(z.number()).nullish(),
  segments_sector_2: z.array(z.number()).nullish(),
  segments_sector_3: z.array(z.number()).nullish(),
});

export type OpenF1Lap = z.infer<typeof OpenF1LapSchema>;

export const StintSchema = z.object({
  session_key: z.number(),
  meeting_key: z.number(),
  driver_number: z.number(),
  stint_number: z.number(),
  lap_start: z.number(),
  lap_end: z.number(),
  compound: z.string(),
  tyre_age_at_start: z.number().optional(),
});

export type Stint = z.infer<typeof StintSchema>;

export const OpenF1PitSchema = z.object({
  session_key: z.number(),
  meeting_key: z.number(),
  driver_number: z.number(),
  lap_number: z.number(),
  stop_number: z.number(),
  pit_duration: z.number().optional(),
  lane_duration: z.number().optional(),
  stop_duration: z.number().optional(),
  date: z.string(),
});

export type OpenF1Pit = z.infer<typeof OpenF1PitSchema>;

export const PositionSchema = z.object({
  session_key: z.number(),
  meeting_key: z.number(),
  driver_number: z.number(),
  position: z.number(),
  date: z.string(),
});

export type Position = z.infer<typeof PositionSchema>;

export const CarDataSchema = z.object({
  session_key: z.number(),
  meeting_key: z.number(),
  driver_number: z.number(),
  date: z.string(),
  speed: z.number().optional(),
  rpm: z.number().optional(),
  n_gear: z.number().optional(),
  throttle: z.number().optional(),
  brake: z.number().optional(),
  drs: z.number().optional(),
});

export type CarData = z.infer<typeof CarDataSchema>;

export const LocationSchema = z.object({
  session_key: z.number(),
  meeting_key: z.number(),
  driver_number: z.number(),
  date: z.string(),
  x: z.number(),
  y: z.number(),
  z: z.number().optional(),
});

export type Location = z.infer<typeof LocationSchema>;

export const WeatherSchema = z.object({
  session_key: z.number(),
  meeting_key: z.number(),
  date: z.string(),
  air_temperature: z.number().optional(),
  track_temperature: z.number().optional(),
  humidity: z.number().optional(),
  pressure: z.number().optional(),
  wind_speed: z.number().optional(),
  wind_direction: z.number().optional(),
  precipitation: z.number().optional(),
  track_surface_temperature: z.number().optional(),
});

export type Weather = z.infer<typeof WeatherSchema>;

export const RaceControlSchema = z.object({
  session_key: z.number(),
  meeting_key: z.number(),
  date: z.string(),
  category: z.string(),
  flag: z.string().optional(),
  scope: z.string().optional(),
  sector: z.number().optional(),
  lap_number: z.number().optional(),
  driver_number: z.number().optional(),
  message: z.string(),
  qualifying_phase: z.string().optional(),
});

export type RaceControl = z.infer<typeof RaceControlSchema>;

export const TeamRadioSchema = z.object({
  session_key: z.number(),
  meeting_key: z.number(),
  driver_number: z.number(),
  date: z.string(),
  message: z.string(),
  driver_id: z.string(),
});

export type TeamRadio = z.infer<typeof TeamRadioSchema>;

export const OvertakeSchema = z.object({
  session_key: z.number(),
  meeting_key: z.number(),
  date: z.string(),
  overtaking_driver_number: z.number(),
  overtaken_driver_number: z.number(),
  position: z.number(),
});

export type Overtake = z.infer<typeof OvertakeSchema>;

export const SessionResultSchema = z.object({
  session_key: z.number(),
  meeting_key: z.number(),
  driver_number: z.number(),
  position: z.number(),
  duration: z.number().optional(),
  gap_to_leader: z.number().optional(),
  number_of_laps: z.number(),
  dnf: z.boolean(),
  dns: z.boolean(),
  dsq: z.boolean(),
});

export type SessionResult = z.infer<typeof SessionResultSchema>;

export const StartingGridSchema = z.object({
  session_key: z.number(),
  meeting_key: z.number(),
  driver_number: z.number(),
  position: z.number(),
  lap_duration: z.number().optional(),
});

export type StartingGrid = z.infer<typeof StartingGridSchema>;

export const IntervalSchema = z.object({
  session_key: z.number(),
  meeting_key: z.number(),
  driver_number: z.number(),
  date: z.string(),
  gap_to_leader: z.number().optional(),
  interval: z.number().optional(),
});

export type Interval = z.infer<typeof IntervalSchema>;