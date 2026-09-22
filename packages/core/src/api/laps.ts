import { Effect, Either, Schema } from "effect";
import { F1ClientService } from "../http/service";
import { TimingSchema } from "../schemas/timing";

const BASE_URL = "https://api.jolpi.ca/ergast/f1";

const LapSchema = Schema.Struct({
  number: Schema.String,
  Timings: Schema.Array(TimingSchema),
});

const LapsResponseSchema = Schema.Struct({
  MRData: Schema.Struct({
    RaceTable: Schema.Struct({
      season: Schema.String,
      round: Schema.String,
      Races: Schema.Array(
        Schema.Struct({
          season: Schema.String,
          round: Schema.String,
          raceName: Schema.String,
          Laps: Schema.Array(LapSchema),
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

export const getLaps = Effect.fn("getLaps")(function* (
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

  const params: Record<string, string | number> = {};
  if (driverId) params.driver = driverId;

  const client = yield* F1ClientService;
  const response = yield* client.fetch<unknown>(`${BASE_URL}/${year}/${round}/laps.json`, {
    params,
  });
  const parsed = parseOrDie(LapsResponseSchema, response);

  const races = parsed.MRData.RaceTable.Races;
  if (races.length === 0 || races[0].Laps.length === 0) return [];

  return races[0].Laps;
});
