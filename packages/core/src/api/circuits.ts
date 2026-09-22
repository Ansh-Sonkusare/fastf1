import { Effect, Either, Schema } from "effect";
import { F1ClientService } from "../http/service";
import { CircuitSchema } from "../schemas/race";

const BASE_URL = "https://api.jolpi.ca/ergast/f1";

const CircuitTableResponseSchema = Schema.Struct({
  MRData: Schema.Struct({
    CircuitTable: Schema.Struct({
      circuitId: Schema.optional(Schema.String),
      Circuits: Schema.Array(CircuitSchema),
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

export const getCircuitInfo = Effect.fn("getCircuitInfo")(function* (circuitId: string) {
  const endpoint = `${circuitId}`.replace(/\s+/g, "_").toLowerCase();

  const client = yield* F1ClientService;
  const response = yield* client.fetch<unknown>(`${BASE_URL}/circuits/${endpoint}.json`);
  const parsed = parseOrDie(CircuitTableResponseSchema, response);

  const circuits = parsed.MRData.CircuitTable.Circuits;
  return circuits[0] ?? null;
});
