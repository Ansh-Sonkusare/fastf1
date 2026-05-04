import { z } from "zod";

export const LapSchema = z.object({
  driverId: z.string().min(1),
  lap: z.string(),
  position: z.string().optional(),
  time: z.string().optional(),
  timestamp: z.string().optional(),
});

export type Lap = z.infer<typeof LapSchema>;

export const PitStopSchema = z.object({
  driverId: z.string().min(1),
  lap: z.string(),
  stop: z.string().optional(),
  time: z.string().optional(),
  duration: z.string().optional(),
});

export type PitStop = z.infer<typeof PitStopSchema>;

export const TimingSchema = z.object({
  driverId: z.string().min(1),
  position: z.string().optional(),
  time: z.string().optional(),
  gap: z.string().optional(),
  interval: z.string().optional(),
});

export type Timing = z.infer<typeof TimingSchema>;

export const FastestLapSchema = z.object({
  driverId: z.string().min(1),
  lap: z.string().optional(),
  time: z.string().optional(),
  speed: z.string().optional(),
  timestamp: z.string().optional(),
});

export type FastestLap = z.infer<typeof FastestLapSchema>;
