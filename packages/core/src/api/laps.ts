import { z } from "zod";
import { F1Client } from "../http/client";
import { TimingSchema } from "../schemas/timing";

const client = new F1Client();

const LapSchema = z.object({
  number: z.string(),
  Timings: z.array(TimingSchema),
});

const LapsResponseSchema = z.object({
  MRData: z.object({
    RaceTable: z.object({
      season: z.string(),
      round: z.string(),
      Races: z.array(
        z.object({
          season: z.string(),
          round: z.string(),
          raceName: z.string(),
          Laps: z.array(LapSchema),
        }),
      ),
    }),
  }),
});

export async function getLaps(
  year: number,
  round: number,
  driverId?: string,
): Promise<z.infer<typeof LapSchema>[]> {
  if (year < 1950 || year > new Date().getFullYear() + 1) {
    throw new Error(
      `Invalid year: ${year}. Must be between 1950 and ${new Date().getFullYear() + 1}`,
    );
  }

  if (round < 1 || round > 25) {
    throw new Error(`Invalid round: ${round}. Must be between 1 and 25`);
  }

  const params: Record<string, string | number> = {};
  if (driverId) {
    params.driver = driverId;
  }

  const response = await client.fetch(`/${year}/${round}/laps.json`, params, { method: "GET" });
  const parsed = LapsResponseSchema.parse(response);

  const races = parsed.MRData.RaceTable.Races;
  if (races.length === 0 || races[0].Laps.length === 0) {
    return [];
  }

  return races[0].Laps;
}
