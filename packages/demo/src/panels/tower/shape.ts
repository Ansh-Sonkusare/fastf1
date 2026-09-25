import type { OpenF1Lap, OpenF1Pit, Stint } from "@f1/core";
import type { Crossings } from "../../app/timeline";
import type { DriverNumber } from "../../app/types";

export type LapTone = "overall" | "personal" | "plain";

export interface TowerRow {
  readonly driver: DriverNumber;
  readonly position: number;
  /** "LEADER", "+1.234", "+1 L", "OUT" */
  readonly gap: string;
  /** Seconds to the car ahead on the same lap; null for the leader or a lapped/out car. */
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
}

interface Standing {
  driver: DriverNumber;
  done: number;
  at: number;
  out: boolean;
}

/** Running order at the end of `lap`, from lap-completion times. */
export function buildTower({ lap, crossings, laps, stints, pits }: TowerInput): TowerRow[] {
  const lapEnd = Math.min(
    ...[...crossings.values()].map((t) => t[lap] ?? Number.POSITIVE_INFINITY),
  );
  const standings: Standing[] = [];
  for (const [driver, t] of crossings) {
    let done = 0;
    for (let n = Math.min(lap, t.length - 1); n >= 1; n--) {
      if (t[n] !== undefined) {
        done = n;
        break;
      }
    }
    const final = t[t.length - 1] ?? Number.NEGATIVE_INFINITY;
    const out = t.length - 1 < lap && final < lapEnd;
    standings.push({ driver, done, at: t[done] ?? Number.POSITIVE_INFINITY, out });
  }
  standings.sort((x, y) => y.done - x.done || x.at - y.at);

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
    const aheadAt = ahead ? crossings.get(ahead.driver)?.[s.done] : undefined;
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
      interval: i > 0 && !s.out && lapsDown === 0 && aheadAt !== undefined ? (s.at - aheadAt) / 1000 : null,
      last,
      lastTone: last === null ? "plain" : last === overall ? "overall" : last === best ? "personal" : "plain",
      best,
      bestIsOverall: best !== null && best === overall,
      compound: stint?.compound ?? null,
      tyreAge: stint ? (stint.tyre_age_at_start ?? 0) + onLap - stint.lap_start + 1 : null,
      pits: pits.filter((p) => p.driver_number === s.driver && p.lap_number != null && p.lap_number <= lap).length,
    };
  });
}
