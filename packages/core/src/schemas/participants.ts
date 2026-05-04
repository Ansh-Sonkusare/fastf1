import { z } from "zod";

export const DriverSchema = z.object({
  driverId: z.string().min(1).optional(),
  permanentNumber: z.string().optional(),
  code: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  nationality: z.string().optional(),
  dateOfBirth: z.string().optional(),
  url: z.string().optional(),
});

export type Driver = z.infer<typeof DriverSchema>;

export const ConstructorSchema = z.object({
  constructorId: z.string().optional(),
  name: z.string().optional(),
  nationality: z.string().optional(),
  url: z.string().optional(),
});

export type Constructor = z.infer<typeof ConstructorSchema>;

export const TeamSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().min(1),
  nationality: z.string().optional(),
  url: z.string().url().optional(),
});

export type Team = z.infer<typeof TeamSchema>;

export const DriverStandingSchema = z.object({
  position: z.string(),
  positionText: z.string(),
  points: z.string(),
  wins: z.string(),
  Driver: DriverSchema,
  Constructors: z.array(ConstructorSchema),
});

export type DriverStanding = z.infer<typeof DriverStandingSchema>;

export const ConstructorStandingSchema = z.object({
  position: z.string(),
  positionText: z.string(),
  points: z.string(),
  wins: z.string(),
  Constructor: ConstructorSchema,
});

export type ConstructorStanding = z.infer<typeof ConstructorStandingSchema>;
