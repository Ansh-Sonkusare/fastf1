import type { OpenF1Lap, RaceControl } from "@f1/core";
import type { DriverNumber, LapWindow } from "./types";

/** Per driver, epoch ms at which lap n was completed (`crossings[n]`); index 0 = lap 1 start. */
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
 * OpenF1 never sends a track GREEN after a safety car, only "... IN THIS LAP" / "... ENDING",
 * so neutralisation ends once the replay is past that message's lap.
 */
export function flagAt(rows: readonly RaceControl[], at: string, lap: number): FlagState {
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
        neutralEndsLap = r.lap_number ?? lap;
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
