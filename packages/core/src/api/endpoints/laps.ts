import { Effect } from "effect";
import {
  OpenF1LapSchema,
  OpenF1PitSchema,
  PositionSchema,
  StintSchema,
} from "../../schemas/openf1";
import { fetchOpenF1, parseArray } from "./_shared";

export const getOpenF1Laps = Effect.fn("getOpenF1Laps")(function* (
  sessionKey: number,
  driverNumber?: number,
  lapNumber?: number,
) {
  const params: Record<string, string | number> = { session_key: sessionKey };
  if (driverNumber) params.driver_number = driverNumber;
  if (lapNumber) params.lap_number = lapNumber;
  const raw = yield* fetchOpenF1<unknown>("/laps", params);
  return parseArray(OpenF1LapSchema, raw);
});

export const getStints = Effect.fn("getStints")(function* (
  sessionKey: number,
  driverNumber?: number,
) {
  const params: Record<string, string | number> = { session_key: sessionKey };
  if (driverNumber) params.driver_number = driverNumber;
  const raw = yield* fetchOpenF1<unknown>("/stints", params);
  return parseArray(StintSchema, raw);
});

export const getPitStops = Effect.fn("getPitStops")(function* (
  sessionKey: number,
  driverNumber?: number,
) {
  const params: Record<string, string | number> = { session_key: sessionKey };
  if (driverNumber) params.driver_number = driverNumber;
  const raw = yield* fetchOpenF1<unknown>("/pit", params);
  return parseArray(OpenF1PitSchema, raw);
});

export const getPosition = Effect.fn("getPosition")(function* (
  sessionKey: number,
  driverNumber?: number,
) {
  const params: Record<string, string | number> = { session_key: sessionKey };
  if (driverNumber) params.driver_number = driverNumber;
  const raw = yield* fetchOpenF1<unknown>("/position", params);
  return parseArray(PositionSchema, raw);
});
