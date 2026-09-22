import { Schema } from "effect";

export const DriverSchema = Schema.Struct({
  driverId: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
  permanentNumber: Schema.optional(Schema.String),
  code: Schema.optional(Schema.String),
  givenName: Schema.optional(Schema.String),
  familyName: Schema.optional(Schema.String),
  nationality: Schema.optional(Schema.String),
  dateOfBirth: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String),
});
export type Driver = Schema.Schema.Type<typeof DriverSchema>;

export const ConstructorSchema = Schema.Struct({
  constructorId: Schema.optional(Schema.String),
  name: Schema.optional(Schema.String),
  nationality: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String),
});
export type Constructor = Schema.Schema.Type<typeof ConstructorSchema>;

export const TeamSchema = Schema.Struct({
  teamId: Schema.String.pipe(Schema.minLength(1)),
  name: Schema.String.pipe(Schema.minLength(1)),
  nationality: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String),
});
export type Team = Schema.Schema.Type<typeof TeamSchema>;

export const DriverStandingSchema = Schema.Struct({
  position: Schema.String,
  positionText: Schema.String,
  points: Schema.String,
  wins: Schema.String,
  Driver: DriverSchema,
  Constructors: Schema.Array(ConstructorSchema),
});
export type DriverStanding = Schema.Schema.Type<typeof DriverStandingSchema>;

export const ConstructorStandingSchema = Schema.Struct({
  position: Schema.String,
  positionText: Schema.String,
  points: Schema.String,
  wins: Schema.String,
  Constructor: ConstructorSchema,
});
export type ConstructorStanding = Schema.Schema.Type<typeof ConstructorStandingSchema>;
