import { Effect, Either, Schema } from "effect";
import { F1ClientService } from "../http/service";
import { ConstructorStandingSchema, DriverStandingSchema } from "../schemas/participants";

const BASE_URL = "https://api.jolpi.ca/ergast/f1";

const DriverStandingsResponseSchema = Schema.Struct({
  MRData: Schema.Struct({
    StandingsTable: Schema.Struct({
      season: Schema.String,
      StandingsLists: Schema.Array(
        Schema.Struct({
          season: Schema.String,
          round: Schema.optional(Schema.String),
          DriverStandings: Schema.Array(DriverStandingSchema),
        }),
      ),
    }),
  }),
});

const ConstructorStandingsResponseSchema = Schema.Struct({
  MRData: Schema.Struct({
    StandingsTable: Schema.Struct({
      season: Schema.String,
      StandingsLists: Schema.Array(
        Schema.Struct({
          season: Schema.String,
          round: Schema.optional(Schema.String),
          ConstructorStandings: Schema.Array(ConstructorStandingSchema),
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

export const getDriverStandings = Effect.fn("getDriverStandings")(function* (
  year: number,
  round?: number,
) {
  if (year < 1950 || year > new Date().getFullYear() + 1) {
    return yield* Effect.die(
      new Error(`Invalid year: ${year}. Must be between 1950 and ${new Date().getFullYear() + 1}`),
    );
  }
  const endpoint = round
    ? `/${year}/${round}/driverStandings.json`
    : `/${year}/driverStandings.json`;

  const client = yield* F1ClientService;
  const response = yield* client.fetch<unknown>(`${BASE_URL}${endpoint}`);
  const parsed = parseOrDie(DriverStandingsResponseSchema, response);
  const standings = parsed.MRData.StandingsTable.StandingsLists;
  if (standings.length === 0 || standings[0].DriverStandings.length === 0) return [];
  return standings[0].DriverStandings;
});

export const getConstructorStandings = Effect.fn("getConstructorStandings")(function* (
  year: number,
  round?: number,
) {
  if (year < 1950 || year > new Date().getFullYear() + 1) {
    return yield* Effect.die(
      new Error(`Invalid year: ${year}. Must be between 1950 and ${new Date().getFullYear() + 1}`),
    );
  }
  const endpoint = round
    ? `/${year}/${round}/constructorStandings.json`
    : `/${year}/constructorStandings.json`;

  const client = yield* F1ClientService;
  const response = yield* client.fetch<unknown>(`${BASE_URL}${endpoint}`);
  const parsed = parseOrDie(ConstructorStandingsResponseSchema, response);
  const standings = parsed.MRData.StandingsTable.StandingsLists;
  if (standings.length === 0 || standings[0].ConstructorStandings.length === 0) return [];
  return standings[0].ConstructorStandings;
});
