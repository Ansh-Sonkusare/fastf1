import { z } from "zod";

export const LocationSchema = z.object({
  lat: z.string(),
  long: z.string(),
  locality: z.string(),
  country: z.string(),
});

export type Location = z.infer<typeof LocationSchema>;

export const CircuitSchema = z.object({
  circuitId: z.string().min(1),
  url: z.string().url(),
  circuitName: z.string().min(1),
  Location: LocationSchema,
});

export type Circuit = z.infer<typeof CircuitSchema>;

export const SessionDateTimeSchema = z.object({
  date: z.string(),
  time: z.string().optional(),
});

export type SessionDateTime = z.infer<typeof SessionDateTimeSchema>;

export const RaceSchema = z.object({
  season: z.string().min(1),
  round: z.string(),
  url: z.string().url(),
  raceName: z.string().min(1),
  Circuit: CircuitSchema,
  date: z.string(),
  time: z.string().optional(),
  FirstPractice: SessionDateTimeSchema.optional(),
  SecondPractice: SessionDateTimeSchema.optional(),
  ThirdPractice: SessionDateTimeSchema.optional(),
  Qualifying: SessionDateTimeSchema.optional(),
  Sprint: SessionDateTimeSchema.optional(),
});

export type Race = z.infer<typeof RaceSchema>;

export const SeasonSchema = z.object({
  season: z.string().min(1),
  url: z.string().url(),
});

export type Season = z.infer<typeof SeasonSchema>;

export const RaceTableSchema = z.object({
  Races: z.array(RaceSchema),
});

export type RaceTable = z.infer<typeof RaceTableSchema>;

export const ScheduleResponseSchema = z.object({
  MRData: z.object({
    RaceTable: RaceTableSchema,
  }),
});

export type ScheduleResponse = z.infer<typeof ScheduleResponseSchema>;
