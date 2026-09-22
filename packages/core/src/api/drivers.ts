import { Effect, Either, Schema } from "effect";
import { F1ClientService } from "../http/service";
import { DriverSchema } from "../schemas/participants";

const BASE_URL = "https://api.jolpi.ca/ergast/f1";

const DriverTableResponseSchema = Schema.Struct({
  MRData: Schema.Struct({
    DriverTable: Schema.Struct({
      driverId: Schema.optional(Schema.String),
      Drivers: Schema.Array(DriverSchema),
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

export const getDriverCareer = Effect.fn("getDriverCareer")(function* (driverId: string) {
  const client = yield* F1ClientService;
  const response = yield* client.fetch<unknown>(`${BASE_URL}/drivers/${driverId}.json`);
  const parsed = parseOrDie(DriverTableResponseSchema, response);

  const drivers = parsed.MRData.DriverTable.Drivers;
  return drivers[0] ?? null;
});
