import { Effect, Either, Schema } from "effect";
import { F1ClientService } from "../http/service";
import { type RaceTable, ScheduleResponseSchema } from "../schemas/race";

const BASE_URL = "https://api.jolpi.ca/ergast/f1";

export const getSchedule = Effect.fn("getSchedule")(function* (year: number) {
  if (year < 1950 || year > new Date().getFullYear() + 1) {
    return yield* Effect.die(
      new Error(`Invalid year: ${year}. Must be between 1950 and ${new Date().getFullYear() + 1}`),
    );
  }

  const client = yield* F1ClientService;
  const response = yield* client.fetch<unknown>(`${BASE_URL}/${year}.json`);
  const decoded = Schema.decodeUnknownEither(ScheduleResponseSchema)(response);
  if (Either.isLeft(decoded)) {
    return yield* Effect.die(new Error(String(decoded.left)));
  }
  return decoded.right.MRData.RaceTable as RaceTable;
});
