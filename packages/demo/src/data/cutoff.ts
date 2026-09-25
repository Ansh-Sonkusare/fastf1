import type { OpenF1Lap, OpenF1Pit, Stint } from "@f1/core";
import type { OpenF1Endpoint, OpenF1Rows } from "./openf1";

/** What is known at one instant of the race. Replay hides everything after it. */
export interface Cursor {
  /** Epoch ms. */
  readonly at: number;
  /** The lap the driver is running at `at`: 0 before the start, completed laps + 1 after. */
  readonly lapOf: (driver: number) => number;
  /** The flag has fallen, so the classification exists. */
  readonly finished: boolean;
}

export const OMNISCIENT: Cursor = { at: Number.POSITIVE_INFINITY, lapOf: () => Number.POSITIVE_INFINITY, finished: true };

type Cut<E extends OpenF1Endpoint> = (rows: readonly OpenF1Rows[E][], cursor: Cursor) => readonly OpenF1Rows[E][];

const all = <R>(rows: readonly R[]) => rows;
const dated = <R extends { readonly date: string }>(rows: readonly R[], { at }: Cursor) =>
  rows.filter((r) => Date.parse(r.date) <= at);

/** One masked copy per row and reveal level, so an unchanged cut keeps its row identities. */
function memo<R extends object>(cache: WeakMap<R, Map<number, R>>, row: R, level: number, make: () => R): R {
  let byLevel = cache.get(row);
  if (!byLevel) cache.set(row, (byLevel = new Map()));
  let out = byLevel.get(level);
  if (!out) byLevel.set(level, (out = make()));
  return out;
}

const lapCache = new WeakMap<OpenF1Lap, Map<number, OpenF1Lap>>();

/** Sectors of the lap in progress that the car has crossed by `at`: 0, 1 or 2. */
function sectorsCrossed(lap: OpenF1Lap, at: number): number {
  if (!lap.date_start) return 0;
  const elapsed = (at - Date.parse(lap.date_start)) / 1000;
  const s1 = lap.duration_sector_1;
  const s2 = lap.duration_sector_2;
  if (s1 == null || elapsed < s1) return 0;
  return s2 != null && elapsed >= s1 + s2 ? 2 : 1;
}

function lapAt(lap: OpenF1Lap, cursor: Cursor): OpenF1Lap | null {
  const running = cursor.lapOf(lap.driver_number);
  if (lap.lap_number < running) return lap;
  if (lap.lap_number > running) return null;
  const crossed = sectorsCrossed(lap, cursor.at);
  return memo(lapCache, lap, crossed, () => ({
    ...lap,
    lap_duration: undefined,
    duration_sector_3: undefined,
    st_speed: undefined,
    segments_sector_3: undefined,
    ...(crossed < 2 && { duration_sector_2: undefined, i2_speed: undefined, segments_sector_2: undefined }),
    ...(crossed < 1 && { duration_sector_1: undefined, i1_speed: undefined, segments_sector_1: undefined }),
  }));
}

const stintCache = new WeakMap<Stint, Map<number, Stint>>();

function stintAt(stint: Stint, cursor: Cursor): Stint | null {
  const running = cursor.lapOf(stint.driver_number);
  if (stint.lap_start > running) return null;
  if (stint.lap_end <= running) return stint;
  return memo(stintCache, stint, running, () => ({ ...stint, lap_end: running }));
}

/** A stop is known once the car leaves the pit lane. */
function pitKnown(pit: OpenF1Pit, cursor: Cursor): boolean {
  if (!pit.date) return pit.lap_number != null && pit.lap_number < cursor.lapOf(pit.driver_number);
  return Date.parse(pit.date) + (pit.pit_duration ?? 0) * 1000 <= cursor.at;
}

const keep = <T>(x: T | null): x is T => x !== null;

/** Per endpoint, the rows known at the cursor. Row shapes never change; hidden fields become undefined. */
export const CUTOFF: { readonly [E in OpenF1Endpoint]: Cut<E> } = {
  drivers: all,
  starting_grid: all,
  session_result: (rows, cursor) => (cursor.finished ? rows : []),
  laps: (rows, cursor) => rows.map((l) => lapAt(l, cursor)).filter(keep),
  stints: (rows, cursor) => rows.map((s) => stintAt(s, cursor)).filter(keep),
  pit: (rows, cursor) => rows.filter((p) => pitKnown(p, cursor)),
  race_control: dated,
  team_radio: dated,
  weather: dated,
  position: dated,
  intervals: dated,
  overtakes: dated,
  car_data: dated,
  location: dated,
};

export function cut<E extends OpenF1Endpoint>(endpoint: E, rows: readonly OpenF1Rows[E][], cursor: Cursor) {
  return cursor === OMNISCIENT ? rows : (CUTOFF[endpoint] as Cut<E>)(rows, cursor);
}
