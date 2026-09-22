import { Effect } from "effect";
import { CarDataSchema, LocationSchema } from "../../schemas/openf1";
import { fetchOpenF1, parseArray } from "./_shared";

export const getCarData = Effect.fn("getCarData")(function* (
  sessionKey: number,
  driverNumber?: number,
  opts?: { dateGt?: string; dateLt?: string },
) {
  const params: Record<string, string | number> = { session_key: sessionKey };
  if (driverNumber) params.driver_number = driverNumber;
  if (opts?.dateGt) params["date>"] = opts.dateGt;
  if (opts?.dateLt) params["date<"] = opts.dateLt;
  const raw = yield* fetchOpenF1<unknown>("/car_data", params);
  return parseArray(CarDataSchema, raw);
});

export const getLocation = Effect.fn("getLocation")(function* (
  sessionKey: number,
  driverNumber?: number,
) {
  const params: Record<string, string | number> = { session_key: sessionKey };
  if (driverNumber) params.driver_number = driverNumber;
  const raw = yield* fetchOpenF1<unknown>("/location", params);
  return parseArray(LocationSchema, raw);
});
