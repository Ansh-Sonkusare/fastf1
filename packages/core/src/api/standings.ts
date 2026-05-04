import { z } from "zod";
import { F1Client } from "../http/client";
import { ConstructorStandingSchema, DriverStandingSchema } from "../schemas/participants";

const client = new F1Client();

const DriverStandingsResponseSchema = z.object({
  MRData: z.object({
    StandingsTable: z.object({
      season: z.string(),
      StandingsLists: z.array(
        z.object({
          season: z.string(),
          round: z.string().optional(),
          DriverStandings: z.array(DriverStandingSchema),
        }),
      ),
    }),
  }),
});

const ConstructorStandingsResponseSchema = z.object({
  MRData: z.object({
    StandingsTable: z.object({
      season: z.string(),
      StandingsLists: z.array(
        z.object({
          season: z.string(),
          round: z.string().optional(),
          ConstructorStandings: z.array(ConstructorStandingSchema),
        }),
      ),
    }),
  }),
});

export async function getDriverStandings(
  year: number,
  round?: number,
): Promise<z.infer<typeof DriverStandingSchema>[]> {
  if (year < 1950 || year > new Date().getFullYear() + 1) {
    throw new Error(
      `Invalid year: ${year}. Must be between 1950 and ${new Date().getFullYear() + 1}`,
    );
  }

  const endpoint = round
    ? `/${year}/${round}/driverStandings.json`
    : `/${year}/driverStandings.json`;
  const response = await client.fetch(endpoint, {}, { method: "GET" });
  const parsed = DriverStandingsResponseSchema.parse(response);

  const standings = parsed.MRData.StandingsTable.StandingsLists;
  if (standings.length === 0 || standings[0].DriverStandings.length === 0) {
    return [];
  }

  return standings[0].DriverStandings;
}

export async function getConstructorStandings(
  year: number,
  round?: number,
): Promise<z.infer<typeof ConstructorStandingSchema>[]> {
  if (year < 1950 || year > new Date().getFullYear() + 1) {
    throw new Error(
      `Invalid year: ${year}. Must be between 1950 and ${new Date().getFullYear() + 1}`,
    );
  }

  const endpoint = round
    ? `/${year}/${round}/constructorStandings.json`
    : `/${year}/constructorStandings.json`;
  const response = await client.fetch(endpoint, {}, { method: "GET" });
  const parsed = ConstructorStandingsResponseSchema.parse(response);

  const standings = parsed.MRData.StandingsTable.StandingsLists;
  if (standings.length === 0 || standings[0].ConstructorStandings.length === 0) {
    return [];
  }

  return standings[0].ConstructorStandings;
}
