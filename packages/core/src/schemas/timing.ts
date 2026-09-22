import { Schema } from "effect";

export const LapSchema = Schema.Struct({
  driverId: Schema.String.pipe(Schema.minLength(1)),
  lap: Schema.String,
  position: Schema.optional(Schema.String),
  time: Schema.optional(Schema.String),
  timestamp: Schema.optional(Schema.String),
});
export type Lap = Schema.Schema.Type<typeof LapSchema>;

export const PitStopSchema = Schema.Struct({
  driverId: Schema.String.pipe(Schema.minLength(1)),
  lap: Schema.String,
  stop: Schema.optional(Schema.String),
  time: Schema.optional(Schema.String),
  duration: Schema.optional(Schema.String),
});
export type PitStop = Schema.Schema.Type<typeof PitStopSchema>;

export const TimingSchema = Schema.Struct({
  driverId: Schema.String.pipe(Schema.minLength(1)),
  position: Schema.optional(Schema.String),
  time: Schema.optional(Schema.String),
  gap: Schema.optional(Schema.String),
  interval: Schema.optional(Schema.String),
});
export type Timing = Schema.Schema.Type<typeof TimingSchema>;

export const FastestLapSchema = Schema.Struct({
  driverId: Schema.String.pipe(Schema.minLength(1)),
  lap: Schema.optional(Schema.String),
  time: Schema.optional(Schema.String),
  speed: Schema.optional(Schema.String),
  timestamp: Schema.optional(Schema.String),
});
export type FastestLap = Schema.Schema.Type<typeof FastestLapSchema>;
