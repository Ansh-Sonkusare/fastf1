import type { OpenF1Driver, OpenF1Lap, Stint } from "@f1/core";
import type { PitStop } from "../../app/timeline";
import { median } from "./stats";
import type { Compound, Race, RaceDriver, RaceLap } from "./types";

// @f1/core types nullish fields as optional; the OpenF1 wire sends null.
type Row<T> = {
  readonly [K in keyof T]: undefined extends T[K] ? T[K] | null : T[K];
};
type LapRow = Row<
  Pick<OpenF1Lap, "driver_number" | "lap_number" | "date_start" | "lap_duration" | "is_pit_out_lap">
>;
type StintRow = Row<
  Pick<
    Stint,
    "driver_number" | "stint_number" | "lap_start" | "lap_end" | "compound" | "tyre_age_at_start"
  >
>;
type DriverRow = Row<Pick<OpenF1Driver, "driver_number" | "name_acronym" | "team_colour">>;

export interface RaceRows {
  readonly laps: readonly LapRow[];
  readonly stints: readonly StintRow[];
  /** Real stops only, from the console's `realPitStops`, so SC pit-lane drive-throughs never count. */
  readonly stops: readonly PitStop[];
  readonly drivers: readonly DriverRow[];
  /** The scheduled race distance. Rows cut at a replay cursor stop short of it, so it can't be read from them. */
  readonly totalLaps: number;
}

export interface Standing {
  readonly driver: RaceDriver;
  readonly position: number;
  readonly gapToLeader: number;
}

const COMPOUNDS: readonly Compound[] = ["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"];
const NEUTRAL_FACTOR = 1.15;

const seconds = (iso: string) => Date.parse(iso) / 1000;

export function parseRace(rows: RaceRows): Race {
  const start = Math.min(
    ...rows.laps.flatMap((l) =>
      l.lap_number === 1 && l.date_start ? [seconds(l.date_start)] : [],
    ),
  );
  const drivers = rows.drivers
    .map((d) =>
      parseDriver(
        d,
        rows.laps.filter((l) => l.driver_number === d.driver_number),
        realStints(
          rows.stints.filter((s) => s.driver_number === d.driver_number),
          rows.stops.filter((p) => p.driver === d.driver_number),
        ),
        start,
      ),
    )
    .filter((d) => d.laps.length > 0);
  return {
    totalLaps: rows.totalLaps,
    drivers,
    neutralLaps: detectNeutralLaps(drivers),
    pitStops: rows.stops.flatMap((p) =>
      p.lane == null ? [] : [{ lap: p.lap, laneDuration: p.lane }],
    ),
  };
}

/**
 * A safety car led through the pit lane opens a same-compound stint with no stop behind it. Fold such a stint into
 * the one before, so the tyre keeps its age and no pit laps appear where nobody stopped.
 */
function realStints(stints: readonly StintRow[], stops: readonly PitStop[]): StintRow[] {
  const out: StintRow[] = [];
  for (const s of [...stints].sort((a, b) => a.stint_number - b.stint_number)) {
    const prev = out[out.length - 1];
    const stopped = stops.some((p) => p.lap === s.lap_start - 1 || p.lap === s.lap_start);
    if (prev && prev.compound === s.compound && !stopped)
      out[out.length - 1] = { ...prev, lap_end: s.lap_end };
    else out.push(s);
  }
  return out;
}

function parseDriver(
  row: DriverRow,
  laps: readonly LapRow[],
  stints: readonly StintRow[],
  start: number,
): RaceDriver {
  const byLap = new Map(laps.map((l) => [l.lap_number, l]));
  const last = Math.max(0, ...byLap.keys());
  const out: RaceLap[] = [];
  for (let lap = 1; lap <= last; lap++) {
    const l = byLap.get(lap);
    const next = byLap.get(lap + 1)?.date_start;
    const crossedAt = next
      ? seconds(next) - start
      : l?.date_start && l.lap_duration != null
        ? seconds(l.date_start) + l.lap_duration - start
        : null;
    // Past the final stint's lap_end (a retirement lap OpenF1 leaves unassigned) the car is still on that set.
    const stint =
      stints.find((s) => s.lap_start <= lap && lap <= s.lap_end) ??
      [...stints].reverse().find((s) => s.lap_start <= lap);
    const compound = COMPOUNDS.find((c) => c === stint?.compound) ?? null;
    out.push({
      lap,
      time: l?.lap_duration ?? null,
      crossedAt,
      compound,
      tyreAge: stint ? (stint.tyre_age_at_start ?? 0) + lap - stint.lap_start + 1 : lap,
      stint: stint?.stint_number ?? 1,
      pitIn:
        !!stint && lap === stint.lap_end && stints.some((s) => s.stint_number > stint.stint_number),
      pitOut: !!l?.is_pit_out_lap || (!!stint && lap === stint.lap_start && stint.stint_number > 1),
    });
  }
  while (out.length > 0 && out[out.length - 1].crossedAt == null) out.pop();
  return {
    number: row.driver_number,
    code: row.name_acronym,
    color: `#${row.team_colour}`,
    laps: out,
  };
}

/** Laps after lap 1 whose field-median time exceeds 1.15x the median of all per-lap medians. */
export function detectNeutralLaps(drivers: readonly RaceDriver[]): ReadonlySet<number> {
  const last = Math.max(0, ...drivers.map((d) => d.laps.length));
  const medians = new Map<number, number>();
  for (let lap = 2; lap <= last; lap++) {
    const times = drivers.flatMap((d) => {
      const t = d.laps[lap - 1]?.time;
      return t == null ? [] : [t];
    });
    if (times.length > 0) medians.set(lap, median(times));
  }
  const typical = median([...medians.values()]);
  return new Set([...medians].filter(([, m]) => m > NEUTRAL_FACTOR * typical).map(([lap]) => lap));
}

/** Drivers who completed `lap`, in the order they crossed the line. */
export function standingsAt(race: Race, lap: number): Standing[] {
  const done = race.drivers
    .flatMap((driver) => {
      const at = driver.laps[lap - 1]?.crossedAt;
      return at == null ? [] : [{ driver, at }];
    })
    .sort((a, b) => a.at - b.at);
  return done.map(({ driver, at }, i) => ({
    driver,
    position: i + 1,
    gapToLeader: at - done[0].at,
  }));
}
