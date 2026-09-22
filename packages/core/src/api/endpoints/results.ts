import { Effect } from "effect";
import { IntervalSchema, SessionResultSchema, StartingGridSchema } from "../../schemas/openf1";
import { fetchOpenF1, parseArray } from "./_shared";

export const getSessionResult = Effect.fn("getSessionResult")(function* (sessionKey: number) {
  const raw = yield* fetchOpenF1<unknown>(`/session_result?session_key=${sessionKey}`);
  return parseArray(SessionResultSchema, raw);
});

export const getStartingGrid = Effect.fn("getStartingGrid")(function* (sessionKey: number) {
  const raw = yield* fetchOpenF1<unknown>(`/starting_grid?session_key=${sessionKey}`);
  return parseArray(StartingGridSchema, raw);
});

export const getIntervals = Effect.fn("getIntervals")(function* (sessionKey: number) {
  const raw = yield* fetchOpenF1<unknown>(`/intervals?session_key=${sessionKey}`);
  return parseArray(IntervalSchema, raw);
});
