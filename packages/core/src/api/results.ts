import { z } from "zod";
import { F1Client } from "../http/client";
import {
  type QualifyingResult,
  QualifyingResultSchema,
  type RaceResult,
  RaceResultSchema,
} from "../schemas/results";

const client = new F1Client();

const RaceResultsResponseSchema = z.object({
  MRData: z.object({
    RaceTable: z.object({
      season: z.string(),
      round: z.string(),
      Races: z.array(
        z.object({
          season: z.string(),
          round: z.string(),
          raceName: z.string(),
          date: z.string().optional(),
          Results: z.array(RaceResultSchema).optional(),
          QualifyingResults: z.array(QualifyingResultSchema).optional(),
          SprintResults: z.array(RaceResultSchema).optional(),
        }),
      ),
    }),
  }),
});

export type RaceResultsResponse = z.infer<typeof RaceResultsResponseSchema>;

export type ResultType = "race" | "qualifying" | "sprint";

export async function getRaceResults(
  year: number,
  round: number,
  type: ResultType = "race",
): Promise<RaceResultsResponse["MRData"]["RaceTable"]["Races"]> {
  if (year < 1950 || year > new Date().getFullYear() + 1) {
    throw new Error(
      `Invalid year: ${year}. Must be between 1950 and ${new Date().getFullYear() + 1}`,
    );
  }

  if (round < 1 || round > 25) {
    throw new Error(`Invalid round: ${round}. Must be between 1 and 25`);
  }

  const endpoint =
    type === "qualifying"
      ? `/${year}/${round}/qualifying.json`
      : type === "sprint"
        ? `/${year}/${round}/sprint.json`
        : `/${year}/${round}/results.json`;

  const response = await client.fetch(endpoint, {}, { method: "GET" });
  const parsed = RaceResultsResponseSchema.parse(response);

  return parsed.MRData.RaceTable.Races;
}
