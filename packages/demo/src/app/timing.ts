import type { OpenF1Lap } from "@f1/core";
import type { Crossings } from "./timeline";
import type { DriverNumber } from "./types";

/**
 * Per driver, epoch ms at each timing line: index 3(n-1) is the start of lap n, +1 the S1 line, +2 the S2 line,
 * so index 3n is the finish of lap n. Undefined where the lap has no sector times.
 */
export type TimingLines = ReadonlyMap<DriverNumber, readonly (number | undefined)[]>;

export function timingLines(crossings: Crossings, laps: readonly OpenF1Lap[]): TimingLines {
  const sectors = new Map<string, OpenF1Lap>();
  for (const l of laps) sectors.set(`${l.driver_number}:${l.lap_number}`, l);
  const out = new Map<DriverNumber, (number | undefined)[]>();
  for (const [driver, t] of crossings) {
    const p: (number | undefined)[] = [];
    // n = t.length is the lap in progress: its start is known, its sector lines only once crossed.
    for (let n = 1; n <= t.length; n++) {
      const start = t[n - 1];
      const lap = sectors.get(`${driver}:${n}`);
      const s1 = lap?.duration_sector_1;
      const s2 = lap?.duration_sector_2;
      p[3 * (n - 1)] = start;
      p[3 * (n - 1) + 1] = start !== undefined && s1 != null ? start + s1 * 1000 : undefined;
      p[3 * (n - 1) + 2] = start !== undefined && s1 != null && s2 != null ? start + (s1 + s2) * 1000 : undefined;
    }
    p[3 * (t.length - 1)] = t[t.length - 1];
    out.set(driver, p);
  }
  return out;
}

export interface Standing {
  readonly driver: DriverNumber;
  /** Last timing line passed at the instant; -1 before the start. */
  readonly line: number;
  /** Epoch ms the car passed it. */
  readonly passedAt: number;
  /** Laps behind the leader, measured at this car's line. */
  readonly lapsDown: number;
  /** Seconds behind the leader; null when lapped or leading. Counts up while the leader is past the next line. */
  readonly gap: number | null;
  /** Seconds behind the car ahead at this car's line; null for the leader. */
  readonly interval: number | null;
}

const lastPassed = (p: readonly (number | undefined)[], at: number) => {
  for (let i = p.length - 1; i >= 0; i--) if (p[i] !== undefined && (p[i] as number) <= at) return i;
  return -1;
};

/** Running order at epoch ms `at`, as the timing lines saw it: furthest line first, then who reached it first. */
export function standingsAt(lines: TimingLines, at: number): Standing[] {
  const passed = [...lines].map(([driver, p]) => {
    const line = lastPassed(p, at);
    return { driver, p, line, passedAt: line < 0 ? Number.POSITIVE_INFINITY : (p[line] as number) };
  });
  passed.sort((x, y) => y.line - x.line || x.passedAt - y.passedAt || x.driver - y.driver);
  const leader = passed[0];
  /** Seconds `s` trails `ref` at its own line, and at least as long as `ref` has been past the next one. */
  const behind = (s: (typeof passed)[number], ref: (typeof passed)[number] | undefined) => {
    const there = ref?.p[s.line];
    if (s.line < 0 || there === undefined) return null;
    const next = ref?.p[s.line + 1];
    return Math.max(s.passedAt - there, next !== undefined && next <= at ? at - next : 0) / 1000;
  };
  return passed.map((s, i) => {
    let lapsDown = 0;
    while (leader && s.line >= 0 && (leader.p[s.line + 3 * (lapsDown + 1)] ?? Number.POSITIVE_INFINITY) <= s.passedAt) lapsDown++;
    return {
      driver: s.driver,
      line: s.line,
      passedAt: s.passedAt,
      lapsDown,
      gap: i === 0 || lapsDown > 0 ? null : behind(s, leader),
      interval: i === 0 ? null : behind(s, passed[i - 1]),
    };
  });
}
