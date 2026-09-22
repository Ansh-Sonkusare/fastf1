import { Effect } from "effect";
import { MeetingSchema, OpenF1DriverSchema, SessionSchema } from "../../schemas/openf1";
import { fetchOpenF1, parseArray } from "./_shared";

export const getMeetings = Effect.fn("getMeetings")(function* (year: number) {
  const raw = yield* fetchOpenF1<unknown>(`/meetings?year=${year}`);
  return parseArray(MeetingSchema, raw);
});

export const getSessions = Effect.fn("getSessions")(function* (meetingKey: number) {
  const raw = yield* fetchOpenF1<unknown>(`/sessions?meeting_key=${meetingKey}`);
  return parseArray(SessionSchema, raw);
});

export const getDrivers = Effect.fn("getDrivers")(function* (sessionKey: number) {
  const raw = yield* fetchOpenF1<unknown>(`/drivers?session_key=${sessionKey}`);
  return parseArray(OpenF1DriverSchema, raw);
});
