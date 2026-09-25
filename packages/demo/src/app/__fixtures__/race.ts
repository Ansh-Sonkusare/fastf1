import type { OpenF1Lap, OpenF1Pit, RaceControl, Stint } from "@f1/core";

const T0 = Date.parse("2025-12-07T13:03:00Z");
const iso = (s: number) => new Date(T0 + s * 1000).toISOString();

const lap = (driver_number: number, lap_number: number, start: number | null, dur: number | null): OpenF1Lap => ({
  session_key: 9839,
  meeting_key: 1276,
  driver_number,
  lap_number,
  date_start: start === null ? undefined : iso(start),
  lap_duration: dur ?? undefined,
});

/**
 * 3-lap race. VER(1) leads; NOR(4) 1.5 s back, passes PIA(81) on lap 2;
 * PIA sets fastest lap 2; HUL(27) retires after lap 1.
 */
export const laps: OpenF1Lap[] = [
  lap(1, 1, 0, null), lap(1, 2, 90, 88), lap(1, 3, 178, 89),
  lap(4, 1, 0.3, null), lap(4, 2, 91.5, 87.5), lap(4, 3, 179, 88.2),
  lap(81, 1, 0.2, null), lap(81, 2, 91.0, 87.1), lap(81, 3, 178.1, 91),
  lap(27, 1, 0.5, null),
];

export const stints: Stint[] = [
  { session_key: 9839, meeting_key: 1276, driver_number: 1, stint_number: 1, lap_start: 1, lap_end: 3, compound: "MEDIUM", tyre_age_at_start: 0 },
  { session_key: 9839, meeting_key: 1276, driver_number: 4, stint_number: 1, lap_start: 1, lap_end: 2, compound: "SOFT", tyre_age_at_start: 3 },
  { session_key: 9839, meeting_key: 1276, driver_number: 4, stint_number: 2, lap_start: 3, lap_end: 3, compound: "HARD", tyre_age_at_start: 0 },
];

export const pits: OpenF1Pit[] = [
  { session_key: 9839, meeting_key: 1276, driver_number: 4, lap_number: 2, pit_duration: 22 },
];

export const rc = (s: number, fields: Partial<RaceControl>): RaceControl => ({
  session_key: 9839,
  meeting_key: 1276,
  date: iso(s),
  category: "Flag",
  message: "",
  ...fields,
});
export { iso };
