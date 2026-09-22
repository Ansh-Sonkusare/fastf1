import { Effect, Either, Schema } from "effect";
import { F1ClientService } from "../http/service";
import { QualifyingResultSchema, RaceResultSchema } from "../schemas/results";

const BASE_URL = "https://api.jolpi.ca/ergast/f1";

const RaceResultsResponseSchema = Schema.Struct({
  MRData: Schema.Struct({
    RaceTable: Schema.Struct({
      season: Schema.String,
      round: Schema.String,
      Races: Schema.Array(
        Schema.Struct({
          season: Schema.String,
          round: Schema.String,
          raceName: Schema.String,
          date: Schema.optional(Schema.String),
          Results: Schema.optional(Schema.Array(RaceResultSchema)),
          QualifyingResults: Schema.optional(Schema.Array(QualifyingResultSchema)),
          SprintResults: Schema.optional(Schema.Array(RaceResultSchema)),
        }),
      ),
    }),
  }),
});

export type RaceResultsResponse = Schema.Schema.Type<typeof RaceResultsResponseSchema>;
export type ResultType = "race" | "qualifying" | "sprint";

function parseOrDie<A, I>(schema: Schema.Schema<A, I, never>, input: unknown): A {
  const decoded = Schema.decodeUnknownEither(schema)(input);
  if (Either.isLeft(decoded)) {
    throw new Error(String(decoded.left));
  }
  return decoded.right;
}

export const getRaceResults = Effect.fn("getRaceResults")(function* (
  year: number,
  round: number,
  type: ResultType = "race",
) {
  if (year < 1950 || year > new Date().getFullYear() + 1) {
    return yield* Effect.die(
      new Error(`Invalid year: ${year}. Must be between 1950 and ${new Date().getFullYear() + 1}`),
    );
  }
  if (round < 1 || round > 25) {
    return yield* Effect.die(new Error(`Invalid round: ${round}. Must be between 1 and 25`));
  }

  const endpoint =
    type === "qualifying"
      ? `/${year}/${round}/qualifying.json`
      : type === "sprint"
        ? `/${year}/${round}/sprint.json`
        : `/${year}/${round}/results.json`;

  const client = yield* F1ClientService;
  const response = yield* client.fetch<unknown>(`${BASE_URL}${endpoint}`);
  const parsed = parseOrDie(RaceResultsResponseSchema, response);
  return parsed.MRData.RaceTable.Races;
});
