import { Schema } from "effect";
import { ConstructorSchema, DriverSchema } from "./participants";

export const QualifyingResultSchema = Schema.Struct({
  Driver: Schema.optional(DriverSchema),
  Constructor: Schema.optional(ConstructorSchema),
  driverId: Schema.optional(Schema.String),
  constructorId: Schema.optional(Schema.String),
  position: Schema.optional(Schema.String),
  positionText: Schema.optional(Schema.String),
  q1: Schema.optional(Schema.String),
  q2: Schema.optional(Schema.String),
  q3: Schema.optional(Schema.String),
});
export type QualifyingResult = Schema.Schema.Type<typeof QualifyingResultSchema>;

const TimeSchema = Schema.Struct({
  millis: Schema.optional(Schema.String),
  time: Schema.optional(Schema.String),
});

const FastestLapSubSchema = Schema.Struct({
  lap: Schema.optional(Schema.String),
  time: Schema.optional(Schema.String),
  avgSpeed: Schema.optional(Schema.String),
});

export const RaceResultSchema = Schema.Struct({
  Driver: Schema.optional(DriverSchema),
  Constructor: Schema.optional(ConstructorSchema),
  driverId: Schema.optional(Schema.String),
  constructorId: Schema.optional(Schema.String),
  position: Schema.optional(Schema.String),
  positionText: Schema.optional(Schema.String),
  points: Schema.optional(Schema.String),
  laps: Schema.optional(Schema.String),
  grid: Schema.optional(Schema.String),
  status: Schema.optional(Schema.String),
  Time: Schema.optional(TimeSchema),
  FastestLap: Schema.optional(FastestLapSubSchema),
});
export type RaceResult = Schema.Schema.Type<typeof RaceResultSchema>;

export const SprintResultSchema = Schema.Struct({
  Driver: Schema.optional(DriverSchema),
  Constructor: Schema.optional(ConstructorSchema),
  driverId: Schema.optional(Schema.String),
  constructorId: Schema.optional(Schema.String),
  position: Schema.optional(Schema.String),
  positionText: Schema.optional(Schema.String),
  points: Schema.optional(Schema.String),
  laps: Schema.optional(Schema.String),
  grid: Schema.optional(Schema.String),
  status: Schema.optional(Schema.String),
  Time: Schema.optional(TimeSchema),
});
export type SprintResult = Schema.Schema.Type<typeof SprintResultSchema>;
