import { z } from "zod";

export const LocationSchema = z.object({
  lat: z.string().transform(Number),
  long: z.string().transform(Number),
  locality: z.string(),
  country: z.string(),
});

export type Location = z.infer<typeof LocationSchema>;

export const CircuitSchema = z.object({
  circuitId: z.string(),
  circuitName: z.string(),
  url: z.string().optional(),
  Location: LocationSchema,
});

export type Circuit = z.infer<typeof CircuitSchema>;

export const SessionDateTimeSchema = z.object({
  date: z.string().transform((d) => new Date(d)),
  time: z.string().optional(),
});

export type SessionDateTime = z.infer<typeof SessionDateTimeSchema>;

export const RaceSchema = z.object({
  season: z.string(),
  round: z.string(),
  url: z.string().optional(),
  raceName: z.string(),
  Circuit: CircuitSchema,
  date: z.string(),
  time: z.string().optional(),
});

export type Race = z.infer<typeof RaceSchema>;

export const RaceTableSchema = z.object({
  season: z.string(),
  round: z.string().optional(),
  Races: z.array(RaceSchema),
});

export type RaceTable = z.infer<typeof RaceTableSchema>;

export const MRDataSchema = z.object({
  xmlns: z.string(),
  series: z.string(),
  url: z.string(),
  limit: z.string(),
  offset: z.string(),
  total: z.string(),
  RaceTable: RaceTableSchema,
});

export type MRData = z.infer<typeof MRDataSchema>;

export const SeasonSchema = z.object({
  season: z.string(),
  url: z.string().optional(),
});

export type Season = z.infer<typeof SeasonSchema>;