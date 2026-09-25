import type { OpenF1Lap } from "@f1/core";

export type Mark = "overall" | "personal" | "slower" | "none";
export type MiniMark = Mark | "pit";

const SEGMENT: Readonly<Record<number, MiniMark>> = {
  2048: "slower",
  2049: "personal",
  2051: "overall",
  2064: "pit",
};

export interface Trap {
  readonly kmh: number | null;
  readonly fastest: boolean;
}

export interface SectorRow {
  readonly driver: number;
  readonly sectors: readonly { readonly seconds: number | null; readonly mark: Mark }[];
  readonly minis: readonly (readonly MiniMark[])[];
  readonly traps: { readonly i1: Trap; readonly i2: Trap; readonly st: Trap };
}

const SECTOR_KEYS = ["duration_sector_1", "duration_sector_2", "duration_sector_3"] as const;
const SEGMENT_KEYS = ["segments_sector_1", "segments_sector_2", "segments_sector_3"] as const;
const TRAP_KEYS = ["i1_speed", "i2_speed", "st_speed"] as const;

const present = (xs: readonly (number | null | undefined)[]) => xs.filter((x): x is number => x != null);
const minOf = (xs: readonly (number | null | undefined)[]) => {
  const vals = present(xs);
  return vals.length ? Math.min(...vals) : null;
};
const maxOf = (xs: readonly (number | null | undefined)[]) => {
  const vals = present(xs);
  return vals.length ? Math.max(...vals) : null;
};

export function sectorGrid(laps: readonly OpenF1Lap[], lap: number, order: readonly number[]): SectorRow[] {
  const sofar = laps.filter((l) => l.lap_number <= lap);
  const overall = SECTOR_KEYS.map((k) => minOf(sofar.map((l) => l[k])));
  const current = new Map(sofar.filter((l) => l.lap_number === lap).map((l) => [l.driver_number, l]));
  const trapMax = TRAP_KEYS.map((k) => maxOf([...current.values()].map((l) => l[k])));

  const byDriver = new Map<number, OpenF1Lap[]>();
  for (const l of sofar) {
    const own = byDriver.get(l.driver_number);
    if (own) own.push(l);
    else byDriver.set(l.driver_number, [l]);
  }

  return order.map((driver): SectorRow => {
    const row = current.get(driver);
    const own = byDriver.get(driver) ?? [];
    const sectors = SECTOR_KEYS.map((k, i) => {
      const seconds = row?.[k] ?? null;
      const mark: Mark =
        seconds == null ? "none" : seconds === overall[i] ? "overall" : seconds === minOf(own.map((l) => l[k])) ? "personal" : "slower";
      return { seconds, mark };
    });
    const minis = SEGMENT_KEYS.map((k) => (row?.[k] ?? []).map((code): MiniMark => (code == null ? "none" : (SEGMENT[code] ?? "none"))));
    const trap = (i: number): Trap => {
      const kmh = row?.[TRAP_KEYS[i]!] ?? null;
      return { kmh, fastest: kmh != null && kmh === trapMax[i] };
    };
    return { driver, sectors, minis, traps: { i1: trap(0), i2: trap(1), st: trap(2) } };
  });
}
