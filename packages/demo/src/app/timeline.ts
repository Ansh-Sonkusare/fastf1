import type { OpenF1Lap, OpenF1Pit, RaceControl, Stint } from "@f1/core";
import type { DriverNumber, LapWindow } from "./types";

/**
 * Per driver, epoch ms at which lap n was completed (`crossings[n]`); index 0 = lap 1 start.
 * Trailing laps that were never completed (cool-down lap after the flag, the lap a car retired on)
 * are trimmed, so `crossings.length - 1` is the laps the car completed.
 */
export type Crossings = ReadonlyMap<DriverNumber, readonly (number | undefined)[]>;

export function lapCrossings(laps: readonly OpenF1Lap[]): Crossings {
  const starts = new Map<DriverNumber, Map<number, OpenF1Lap>>();
  for (const l of laps) {
    let byLap = starts.get(l.driver_number);
    if (!byLap) starts.set(l.driver_number, (byLap = new Map()));
    byLap.set(l.lap_number, l);
  }
  const out = new Map<DriverNumber, (number | undefined)[]>();
  for (const [driver, byLap] of starts) {
    const t: (number | undefined)[] = [];
    const startOf = (n: number) => {
      const s = byLap.get(n)?.date_start;
      return s ? Date.parse(s) : undefined;
    };
    t[0] = startOf(1);
    const last = Math.max(...byLap.keys());
    for (let n = 1; n <= last; n++) {
      const next = startOf(n + 1);
      const own = byLap.get(n);
      const start = startOf(n);
      t[n] =
        next ??
        (start !== undefined && own?.lap_duration != null ? start + own.lap_duration * 1000 : undefined);
    }
    while (t.length > 1 && t[t.length - 1] === undefined) t.pop();
    out.set(driver, t);
  }
  return out;
}

export interface LapTimeline {
  readonly totalLaps: number;
  /** windows[lap - 1] */
  readonly windows: readonly LapWindow[];
  /** Epoch ms the leader started lap 1. */
  readonly raceStart: number | null;
}

const minOf = (xs: readonly (number | undefined)[]) => {
  const v = xs.filter((x): x is number => x !== undefined);
  return v.length ? Math.min(...v) : undefined;
};

/** Lap n runs from the first car starting it to the first car completing it. */
export function buildTimeline(crossings: Crossings): LapTimeline {
  const rows = [...crossings.values()];
  const totalLaps = Math.max(0, ...rows.map((t) => t.length - 1));
  const windows: LapWindow[] = [];
  for (let n = 1; n <= totalLaps; n++) {
    const start = minOf(rows.map((t) => t[n - 1]));
    const end = minOf(rows.map((t) => t[n]));
    windows.push({
      start: new Date(start ?? end ?? 0).toISOString(),
      end: end === undefined ? null : new Date(end).toISOString(),
    });
  }
  return { totalLaps, windows, raceStart: minOf(rows.map((t) => t[0])) ?? null };
}

/** The race lap in progress at epoch ms `at` (1..totalLaps). */
export function lapAt(timeline: LapTimeline, at: number): number {
  const i = timeline.windows.findIndex((w) => w.end !== null && at < Date.parse(w.end));
  return i === -1 ? Math.max(1, timeline.totalLaps) : i + 1;
}

/**
 * Laps a car counts as having completed at replay lap `lap`: its crossings before the leader
 * completed lap+1, capped at `lap`. Lead-lap cars get `lap`, a car N laps down gets `lap - N`,
 * a retired car its last completed lap. The tower and every per-driver helper use this one rule.
 */
export function lapsDoneAt(crossings: Crossings, driver: DriverNumber, lap: number): number {
  const t = crossings.get(driver) ?? [];
  const nextEnd = Math.min(...[...crossings.values()].map((x) => x[lap + 1] ?? Number.POSITIVE_INFINITY));
  for (let n = Math.min(lap, t.length - 1); n >= 1; n--) {
    const at = t[n];
    if (at !== undefined && at < nextEnd) return n;
  }
  return 0;
}

/** The driver's own lap matching replay lap `cursor` (see lapsDoneAt), never below 1. */
export function ownLap(crossings: Crossings, driver: DriverNumber, cursor: number): number {
  return Math.max(1, lapsDoneAt(crossings, driver, cursor));
}

/** Time bounds of the driver's own lap at replay lap `cursor`; null if that lap was never completed. */
export function driverLapWindow(crossings: Crossings, driver: DriverNumber, cursor: number): LapWindow | null {
  const t = crossings.get(driver);
  const lap = ownLap(crossings, driver, cursor);
  const start = t?.[lap - 1];
  const end = t?.[lap];
  if (start === undefined || end === undefined) return null;
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
}

export const TELEMETRY_BLOCK_LAPS = 10;

export interface LapBlock {
  /** In the driver's own laps. */
  readonly fromLap: number;
  readonly toLap: number;
  readonly window: LapWindow;
}

/**
 * The fixed block of TELEMETRY_BLOCK_LAPS of the driver's own laps containing the lap they were on
 * at replay lap `cursor`. Its window is stable across the block, so car_data/location URLs change
 * once per block. Null when the driver completed no lap of the block.
 */
export function driverLapBlock(crossings: Crossings, driver: DriverNumber, cursor: number): LapBlock | null {
  const t = crossings.get(driver);
  if (!t) return null;
  const lap = ownLap(crossings, driver, cursor);
  const fromLap = Math.floor((lap - 1) / TELEMETRY_BLOCK_LAPS) * TELEMETRY_BLOCK_LAPS + 1;
  if (t.length - 1 < fromLap) return null;
  const toLap = Math.min(fromLap + TELEMETRY_BLOCK_LAPS - 1, t.length - 1);
  const start = t[fromLap - 1];
  if (start === undefined) return null;
  const end = t[toLap];
  return {
    fromLap,
    toLap,
    window: { start: new Date(start).toISOString(), end: end === undefined ? null : new Date(end).toISOString() },
  };
}

/** Elapsed race seconds once the leader completes `lap`. */
export function raceClockAt(timeline: LapTimeline, lap: number): number {
  const w = timeline.windows[lap - 1];
  if (!w || timeline.raceStart === null) return 0;
  return (Date.parse(w.end ?? w.start) - timeline.raceStart) / 1000;
}

export type FlagKind = "green" | "yellow" | "vsc" | "sc" | "red" | "chequered";
export interface FlagState {
  readonly kind: FlagKind;
  readonly label: string;
}

/**
 * Track status as of `at` (ISO) on `lap`, replayed from race control messages.
 * `lapOf` places messages that omit lap_number on the lap timeline.
 * OpenF1 never sends a track GREEN after a safety car, only "... IN THIS LAP" / "... ENDING",
 * so neutralisation ends once the replay is past that message's lap.
 */
export function flagAt(
  rows: readonly RaceControl[],
  at: string,
  lap: number,
  lapOf: (epochMs: number) => number,
): FlagState {
  const cutoff = Date.parse(at);
  let track: FlagKind = "green";
  let neutral: "sc" | "vsc" | null = null;
  let neutralEndsLap = Number.POSITIVE_INFINITY;
  const yellow = new Set<number>();
  const sorted = [...rows].sort((x, y) => Date.parse(x.date) - Date.parse(y.date));
  for (const r of sorted) {
    if (Date.parse(r.date) > cutoff) break;
    const msg = r.message.toUpperCase();
    if (r.category === "SafetyCar") {
      if (msg.includes("DEPLOYED")) {
        neutral = msg.includes("VIRTUAL") ? "vsc" : "sc";
        neutralEndsLap = Number.POSITIVE_INFINITY;
      } else if (msg.includes("IN THIS LAP") || msg.includes("ENDING")) {
        neutralEndsLap = r.lap_number ?? lapOf(Date.parse(r.date));
      }
      continue;
    }
    if (r.category !== "Flag") continue;
    const flag = (r.flag ?? "").toUpperCase();
    if (r.scope === "Sector" && r.sector != null) {
      if (flag.includes("YELLOW")) yellow.add(r.sector);
      else if (flag === "CLEAR" || flag === "GREEN") yellow.delete(r.sector);
    } else if (r.scope === "Track") {
      if (flag === "RED") track = "red";
      else if (flag === "CHEQUERED") track = "chequered";
      else if (flag === "GREEN" || flag === "CLEAR") {
        track = "green";
        neutral = null;
        yellow.clear();
      }
    }
  }
  if (lap > neutralEndsLap) neutral = null;
  if (track === "red") return { kind: "red", label: "RED FLAG" };
  if (track === "chequered") return { kind: "chequered", label: "CHEQUERED FLAG" };
  if (neutral === "sc") return { kind: "sc", label: "SAFETY CAR" };
  if (neutral === "vsc") return { kind: "vsc", label: "VIRTUAL SAFETY CAR" };
  if (yellow.size) {
    const s = [...yellow].sort((x, y) => x - y);
    return { kind: "yellow", label: `YELLOW · SECTOR ${s.join(", ")}` };
  }
  return { kind: "green", label: "GREEN" };
}

/**
 * Laps on which the safety car led the field through the pit lane. OpenF1 records every car's pass
 * as a pit row and a new stint, but nobody stopped. From "SAFETY CAR THROUGH THE PIT LANE" until
 * "... WILL USE START/FINISH STRAIGHT" or the safety car ends.
 */
export function pitLanePassLaps(rows: readonly RaceControl[]): ReadonlySet<number> {
  const laps = new Set<number>();
  let from: number | null = null;
  const sorted = [...rows].sort((x, y) => Date.parse(x.date) - Date.parse(y.date));
  for (const r of sorted) {
    const msg = r.message.toUpperCase();
    if (!msg.includes("SAFETY CAR") || r.lap_number == null) continue;
    if (msg.includes("THROUGH THE PIT LANE")) from ??= r.lap_number;
    else if (from !== null && (msg.includes("START/FINISH STRAIGHT") || msg.includes("IN THIS LAP"))) {
      for (let n = from; n < r.lap_number; n++) laps.add(n);
      from = null;
    }
  }
  return laps;
}

export interface PitStop {
  readonly driver: DriverNumber;
  /** The lap the car came in on (OpenF1 pit row lap_number). */
  readonly lap: number;
  /** Seconds stationary; null when OpenF1 didn't time it (common, even for real stops). */
  readonly stationary: number | null;
  /** Seconds in the pit lane; null when unknown. */
  readonly lane: number | null;
}

/**
 * The one definition of a real pit stop. Every OpenF1 pit row with a lap counts, except
 * safety-car pit-lane drive-throughs: rows on a pitLanePassLaps lap with no stop_duration that no
 * compound change confirms (the pass itself opens a same-compound, age-0 stint).
 * A compound change confirms a row when its new stint starts on the pit lap or the lap after
 * (OpenF1 uses both), and each change confirms one row only; timed stops claim theirs first.
 * A null stop_duration alone never disqualifies a row.
 */
export function realPitStops(
  pits: readonly OpenF1Pit[],
  stints: readonly Stint[],
  passLaps: ReadonlySet<number>,
): PitStop[] {
  const claimed = new Set<Stint>();
  const claimChange = (driver: DriverNumber, lap: number) => {
    const change = stints.find((next) => {
      if (next.driver_number !== driver || claimed.has(next)) return false;
      if (next.lap_start !== lap && next.lap_start !== lap + 1) return false;
      const prev = stints.find((x) => x.driver_number === driver && x.stint_number === next.stint_number - 1);
      return !!prev && prev.compound !== next.compound;
    });
    if (change) claimed.add(change);
    return !!change;
  };
  const rows = pits.filter((p): p is OpenF1Pit & { lap_number: number } => p.lap_number != null);
  const onPass = rows.filter((p) => passLaps.has(p.lap_number)).sort((x, y) => x.lap_number - y.lap_number);
  for (const p of onPass) if (p.stop_duration != null) claimChange(p.driver_number, p.lap_number);
  const drop = new Set(onPass.filter((p) => p.stop_duration == null && !claimChange(p.driver_number, p.lap_number)));
  return rows
    .filter((p) => !drop.has(p))
    .map((p) => ({
      driver: p.driver_number,
      lap: p.lap_number,
      stationary: p.stop_duration ?? null,
      lane: p.lane_duration ?? p.pit_duration ?? null,
    }));
}
