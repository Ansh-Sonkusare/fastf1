import { Schema } from "effect";

export const LocationSchema = Schema.Struct({
  lat: Schema.String,
  long: Schema.String,
  locality: Schema.String,
  country: Schema.String,
});
export type Location = Schema.Schema.Type<typeof LocationSchema>;

export const CircuitSchema = Schema.Struct({
  circuitId: Schema.String.pipe(Schema.minLength(1)),
  url: Schema.String,
  circuitName: Schema.String.pipe(Schema.minLength(1)),
  Location: LocationSchema,
});
export type Circuit = Schema.Schema.Type<typeof CircuitSchema>;

export const SessionDateTimeSchema = Schema.Struct({
  date: Schema.String,
  time: Schema.optional(Schema.String),
});
export type SessionDateTime = Schema.Schema.Type<typeof SessionDateTimeSchema>;

export const RaceSchema = Schema.Struct({
  season: Schema.String.pipe(Schema.minLength(1)),
  round: Schema.String,
  url: Schema.String,
  raceName: Schema.String.pipe(Schema.minLength(1)),
  Circuit: CircuitSchema,
  date: Schema.String,
  time: Schema.optional(Schema.String),
  FirstPractice: Schema.optional(SessionDateTimeSchema),
  SecondPractice: Schema.optional(SessionDateTimeSchema),
  ThirdPractice: Schema.optional(SessionDateTimeSchema),
  Qualifying: Schema.optional(SessionDateTimeSchema),
  Sprint: Schema.optional(SessionDateTimeSchema),
});
export type Race = Schema.Schema.Type<typeof RaceSchema>;

export const SeasonSchema = Schema.Struct({
  season: Schema.String.pipe(Schema.minLength(1)),
  url: Schema.String,
});
export type Season = Schema.Schema.Type<typeof SeasonSchema>;

export const RaceTableSchema = Schema.Struct({
  season: Schema.String.pipe(Schema.minLength(1)),
  round: Schema.optional(Schema.String),
  Races: Schema.Array(RaceSchema),
});
export type RaceTable = Schema.Schema.Type<typeof RaceTableSchema>;

export const ScheduleResponseSchema = Schema.Struct({
  MRData: Schema.Struct({
    RaceTable: RaceTableSchema,
  }),
});
export type ScheduleResponse = Schema.Schema.Type<typeof ScheduleResponseSchema>;
