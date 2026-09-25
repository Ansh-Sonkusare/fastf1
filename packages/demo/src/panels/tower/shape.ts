import type { OpenF1Lap, OpenF1Pit, Stint } from "@f1/core";
import { lapsDoneAt, type Crossings } from "../../app/timeline";
import type { DriverNumber } from "../../app/types";

export type LapTone = "overall" | "personal" | "plain";

export interface TowerRow {
  readonly driver: DriverNumber;
  readonly position: number;
  /** "LEADER", "+1.234", "+1 L", "OUT" */
  readonly gap: string;
  /** Seconds since the car ahead last crossed the line; null for the leader or an OUT car. */
  readonly interval: number | null;
  readonly last: number | null;
  readonly lastTone: LapTone;
  readonly best: number | null;
  readonly bestIsOverall: boolean;
  readonly compound: string | null;
  readonly tyreAge: number | null;
  readonly pits: number;
}

export interface TowerInput {
  readonly lap: number;
  readonly crossings: Crossings;
  readonly laps: readonly OpenF1Lap[];
  readonly stints: readonly Stint[];
  readonly pits: readonly OpenF1Pit[];
  /** Laps the field was routed through the pit lane (see pitLanePassLaps). */
  readonly passLaps: ReadonlySet<number>;
  /** Classified DNF/DNS from session_result; null falls back to a timing heuristic. */
  readonly retired: ReadonlySet<DriverNumber> | null;
}

interface Standing {
  driver: DriverNumber;
  done: number;
  at: number;
  out: boolean;
}

const INF = Number.POSITIVE_INFINITY;

/**
 * Running order once the leader completes `lap`.
 * - Laps done come from lapsDoneAt (shared with the per-driver helpers), so a lapped car counts
 *   one lap fewer on every lap, not only at the flag.
 * - PIT counts pit rows up to the car's own lap. On safety-car pit-lane pass laps a row counts only
 *   with a stop_duration or a compound change: the pass itself opens a same-compound, age-0 stint.
 * - OUT = retired and never completed this lap (including the lap it retired on).
 *   Without classification, retired = last crossing more than one leader lap before the flag
 *   (a running lapped car always takes the flag after the leader).
 */
export function buildTower({ lap, crossings, laps, stints, pits, passLaps, retired }: TowerInput): TowerRow[] {
  const all = [...crossings.values()];
  const firstAt = (n: number) => Math.min(...all.map((t) => t[n] ?? INF));
  const raceLaps = Math.max(0, ...all.map((t) => t.length - 1));
  const flag = firstAt(raceLaps);
  const leaderLastLap = flag - firstAt(raceLaps - 1);
  const isRetired = (driver: DriverNumber, t: readonly (number | undefined)[]) =>
    retired ? retired.has(driver) : (t[t.length - 1] ?? -INF) < flag - leaderLastLap;
  const newCompoundOn = (driver: DriverNumber, lap: number) => {
    const next = stints.find((x) => x.driver_number === driver && x.lap_start === lap);
    const prev = next && stints.find((x) => x.driver_number === driver && x.stint_number === next.stint_number - 1);
    return !!next && !!prev && next.compound !== prev.compound;
  };

  const standings: Standing[] = [];
  for (const [driver, t] of crossings) {
    const done = lapsDoneAt(crossings, driver, lap);
    const out = isRetired(driver, t) && t.length - 1 < lap;
    standings.push({ driver, done, at: t[done] ?? INF, out });
  }
  standings.sort((x, y) => Number(x.out) - Number(y.out) || y.done - x.done || x.at - y.at);

  const lapTimes = new Map<DriverNumber, Map<number, number>>();
  for (const l of laps) {
    if (l.lap_duration == null || l.lap_number > lap) continue;
    let m = lapTimes.get(l.driver_number);
    if (!m) lapTimes.set(l.driver_number, (m = new Map()));
    m.set(l.lap_number, l.lap_duration);
  }
  const bestOf = (d: DriverNumber) => {
    const m = lapTimes.get(d);
    return m && m.size ? Math.min(...m.values()) : null;
  };
  const overall = Math.min(...[...lapTimes.keys()].map((d) => bestOf(d) ?? Number.POSITIVE_INFINITY));

  const leader = standings[0];
  const leaderT = leader ? crossings.get(leader.driver) : undefined;

  return standings.map((s, i) => {
    const ahead = standings[i - 1];
    const lapsDown = leader ? leader.done - s.done : 0;
    const gapS = leaderT?.[s.done] !== undefined ? (s.at - (leaderT[s.done] as number)) / 1000 : null;
    const aheadAt = ahead
      ? Math.max(...(crossings.get(ahead.driver) ?? []).map((x) => (x !== undefined && x <= s.at ? x : -INF)))
      : -INF;
    const last = lapTimes.get(s.driver)?.get(s.done) ?? null;
    const best = bestOf(s.driver);
    const onLap = Math.max(1, Math.min(lap, s.done));
    const stint = stints.find((x) => x.driver_number === s.driver && x.lap_start <= onLap && onLap <= x.lap_end);
    return {
      driver: s.driver,
      position: i + 1,
      gap: s.out
        ? "OUT"
        : i === 0
          ? "LEADER"
          : lapsDown > 0
            ? `+${lapsDown} L`
            : gapS === null
              ? "—"
              : `+${gapS.toFixed(3)}`,
      interval: i > 0 && !s.out && Number.isFinite(aheadAt) ? (s.at - aheadAt) / 1000 : null,
      last,
      lastTone: last === null ? "plain" : last === overall ? "overall" : last === best ? "personal" : "plain",
      best,
      bestIsOverall: best !== null && best === overall,
      compound: stint?.compound ?? null,
      tyreAge: stint ? (stint.tyre_age_at_start ?? 0) + onLap - stint.lap_start + 1 : null,
      pits: pits.filter(
        (p) =>
          p.driver_number === s.driver &&
          p.lap_number != null &&
          p.lap_number <= onLap &&
          !(passLaps.has(p.lap_number) && p.stop_duration == null && !newCompoundOn(s.driver, p.lap_number)),
      ).length,
    };
  });
}
