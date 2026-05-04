import { z } from "zod";

export const QualifyingResultSchema = z.object({
  driverId: z.string().min(1),
  constructorId: z.string().min(1),
  position: z.string().optional(),
  positionText: z.string().optional(),
  q1: z.string().optional(),
  q2: z.string().optional(),
  q3: z.string().optional(),
});

export type QualifyingResult = z.infer<typeof QualifyingResultSchema>;

export const RaceResultSchema = z.object({
  driverId: z.string().min(1),
  constructorId: z.string().min(1),
  position: z.string().optional(),
  positionText: z.string().optional(),
  points: z.string().optional(),
  laps: z.string().optional(),
  grid: z.string().optional(),
  status: z.string().optional(),
  Time: z
    .object({
      millis: z.string().optional(),
      time: z.string().optional(),
    })
    .optional(),
  FastestLap: z
    .object({
      lap: z.string().optional(),
      time: z.string().optional(),
      avgSpeed: z.string().optional(),
    })
    .optional(),
});

export type RaceResult = z.infer<typeof RaceResultSchema>;

export const SprintResultSchema = z.object({
  driverId: z.string().min(1),
  constructorId: z.string().min(1),
  position: z.string().optional(),
  positionText: z.string().optional(),
  points: z.string().optional(),
  laps: z.string().optional(),
  grid: z.string().optional(),
  status: z.string().optional(),
  Time: z
    .object({
      millis: z.string().optional(),
      time: z.string().optional(),
    })
    .optional(),
});

export type SprintResult = z.infer<typeof SprintResultSchema>;
