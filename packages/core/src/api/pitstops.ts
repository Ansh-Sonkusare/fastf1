import { Effect, Either, Schema } from "effect";
import { F1ClientService } from "../http/service";
import { PitStopSchema } from "../schemas/timing";

const BASE_URL = "https://api.jolpi.ca/ergast/f1";

const PitStopsResponseSchema = Schema.Struct({
  MRData: Schema.Struct({
    RaceTable: Schema.Struct({
      season: Schema.String,
      round: Schema.String,
      Races: Schema.Array(
        Schema.Struct({
          season: Schema.String,
          round: Schema.String,
          raceName: Schema.String,
          PitStops: Schema.optional(Schema.Array(PitStopSchema)),
        }),
      ),
    }),
  }),
});

function parseOrDie<A, I>(schema: Schema.Schema<A, I, never>, input: unknown): A {
  const decoded = Schema.decodeUnknownEither(schema)(input);
  if (Either.isLeft(decoded)) {
    throw new Error(String(decoded.left));
  }
  return decoded.right;
}

export const getPitStops = Effect.fn("getPitStops")(function* (
  year: number,
  round: number,
  driverId?: string,
) {
  if (year < 1950 || year > new Date().getFullYear() + 1) {
    return yield* Effect.die(
      new Error(`Invalid year: ${year}. Must be between 1950 and ${new Date().getFullYear() + 1}`),
    );
  }
  if (round < 1 || round > 25) {
    return yield* Effect.die(new Error(`Invalid round: ${round}. Must be between 1 and 25`));
  }

  const client = yield* F1ClientService;
  const response = yield* client.fetch<unknown>(`${BASE_URL}/${year}/${round}/pitstops.json`);
  const parsed = parseOrDie(PitStopsResponseSchema, response);

  const races = parsed.MRData.RaceTable.Races;
  const stops =
    races.length > 0 ? (races[0].PitStops ?? []) : ([] as (typeof PitStopSchema.Type)[]);
  if (stops.length === 0) return [];

  if (!driverId) return stops;
  return stops.filter((s) => s.driverId === driverId);
});
