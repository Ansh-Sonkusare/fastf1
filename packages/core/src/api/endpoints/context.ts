import { Effect } from "effect";
import {
  OvertakeSchema,
  RaceControlSchema,
  TeamRadioSchema,
  WeatherSchema,
} from "../../schemas/openf1";
import { fetchOpenF1, parseArray } from "./_shared";

export const getWeather = Effect.fn("getWeather")(function* (sessionKey: number) {
  const raw = yield* fetchOpenF1<unknown>(`/weather?session_key=${sessionKey}`);
  return parseArray(WeatherSchema, raw);
});

export const getRaceControl = Effect.fn("getRaceControl")(function* (sessionKey: number) {
  const raw = yield* fetchOpenF1<unknown>(`/race_control?session_key=${sessionKey}`);
  return parseArray(RaceControlSchema, raw);
});

export const getTeamRadio = Effect.fn("getTeamRadio")(function* (sessionKey: number) {
  const raw = yield* fetchOpenF1<unknown>(`/team_radio?session_key=${sessionKey}`);
  return parseArray(TeamRadioSchema, raw);
});

export const getOvertakes = Effect.fn("getOvertakes")(function* (sessionKey: number) {
  const raw = yield* fetchOpenF1<unknown>(`/overtakes?session_key=${sessionKey}`);
  return parseArray(OvertakeSchema, raw);
});
