import type { OpenF1Lap } from "@f1/core";

export const ms = (iso: string) => Date.parse(iso);

export function runningOrder(laps: readonly OpenF1Lap[], lap: number): number[] {
  const last = new Map<number, { lap: number; crossed: number }>();
  for (const l of laps) {
    if (l.lap_number > lap || l.date_start == null || l.lap_duration == null) continue;
    const crossed = ms(l.date_start) + l.lap_duration * 1000;
    const prev = last.get(l.driver_number);
    if (!prev || l.lap_number > prev.lap) last.set(l.driver_number, { lap: l.lap_number, crossed });
  }
  const drivers = new Set(laps.map((l) => l.driver_number));
  const rank = (n: number) => last.get(n) ?? { lap: 0, crossed: Number.POSITIVE_INFINITY };
  return [...drivers].sort((x, y) => {
    const a = rank(x);
    const b = rank(y);
    return b.lap - a.lap || a.crossed - b.crossed || x - y;
  });
}
