import type { CarData, OpenF1Lap } from "@f1/core";
import { ms } from "./order";
import { isDrsOpen, runs } from "./track";

export interface Trace {
  readonly lengthM: number;
  readonly time: readonly number[];
  readonly speed: readonly number[];
  readonly throttle: readonly number[];
  readonly brake: readonly boolean[];
  readonly gear: readonly number[];
  readonly drs: readonly boolean[];
}

export const GRID = 300;

interface Sample {
  readonly t: number;
  readonly d: number;
  readonly speed: number;
  readonly throttle: number;
  readonly brake: boolean;
  readonly gear: number;
  readonly drs: boolean;
}

export function buildTrace(lap: OpenF1Lap, carData: readonly CarData[], n = GRID): Trace | null {
  if (lap.date_start == null || lap.lap_duration == null) return null;
  const t0 = ms(lap.date_start);
  const rows = carData
    .filter((c) => c.speed != null)
    .map((c) => ({ ...c, t: (ms(c.date) - t0) / 1000 }))
    .filter((c) => c.t >= 0 && c.t <= lap.lap_duration!)
    .sort((a, b) => a.t - b.t);
  if (rows.length < 2) return null;
  const padded = [{ ...rows[0]!, t: 0 }, ...rows, { ...rows[rows.length - 1]!, t: lap.lap_duration }];

  const samples: Sample[] = [];
  let d = 0;
  padded.forEach((r, i) => {
    if (i > 0) {
      const p = padded[i - 1]!;
      d += (((p.speed ?? 0) + (r.speed ?? 0)) / 2 / 3.6) * (r.t - p.t);
    }
    samples.push({
      t: r.t,
      d,
      speed: r.speed ?? 0,
      throttle: r.throttle ?? 0,
      brake: (r.brake ?? 0) > 0,
      gear: r.n_gear ?? 0,
      drs: isDrsOpen(r.drs),
    });
  });

  const lengthM = d;
  const out = {
    time: [] as number[],
    speed: [] as number[],
    throttle: [] as number[],
    brake: [] as boolean[],
    gear: [] as number[],
    drs: [] as boolean[],
  };
  let k = 0;
  for (let i = 0; i < n; i++) {
    const target = (i / (n - 1)) * lengthM;
    while (k + 2 < samples.length && samples[k + 1]!.d < target) k++;
    const a = samples[k]!;
    const b = samples[k + 1]!;
    const f = b.d > a.d ? Math.min(1, Math.max(0, (target - a.d) / (b.d - a.d))) : 0;
    const lerp = (x: number, y: number) => x + (y - x) * f;
    const held = f < 1 ? a : b;
    out.time.push(lerp(a.t, b.t));
    out.speed.push(lerp(a.speed, b.speed));
    out.throttle.push(lerp(a.throttle, b.throttle));
    out.brake.push(held.brake);
    out.gear.push(held.gear);
    out.drs.push(held.drs);
  }
  return { lengthM, ...out };
}

export function indexAtTime(trace: Trace, seconds: number): number {
  const i = trace.time.findIndex((t) => t >= seconds);
  return i < 0 ? trace.time.length - 1 : i;
}

export interface TelemetryView {
  readonly paths: readonly { readonly who: "A" | "B" | "Δ"; readonly d: string }[];
  readonly lanes: readonly {
    readonly y: number;
    readonly labelY: number;
    readonly label: string;
  }[];
  readonly drs: readonly { readonly x: number; readonly w: number }[];
  readonly sectors: readonly {
    readonly x: number;
    readonly labelX: number;
    readonly label: string;
  }[];
  readonly zeroY: number;
  readonly xOf: (i: number) => number;
  readonly indexAt: (x: number) => number;
  readonly deltaAtLine: number;
}

export const TELEMETRY_VIEW = { width: 900, height: 350, left: 40, right: 890 } as const;

export function telemetryView(a: Trace, b: Trace, lapA: OpenF1Lap): TelemetryView {
  const n = a.time.length;
  const { left, right } = TELEMETRY_VIEW;
  const xOf = (i: number) => left + (i / (n - 1)) * (right - left);
  const indexAt = (x: number) => Math.max(0, Math.min(n - 1, Math.round(((x - left) / (right - left)) * (n - 1))));
  const ySpeed = (v: number) => 132 - ((v - 60) / 280) * 122;
  const yThrottle = (v: number) => 184 - (v / 100) * 42;
  const yBrake = (on: boolean) => 206 - (on ? 14 : 0);
  const yGear = (g: number) => 262 - ((g - 1) / 7) * 48;
  const delta = a.time.map((t, i) => t - b.time[i]!);
  const dmax = Math.max(0.2, Math.ceil(Math.max(...delta.map(Math.abs)) * 10) / 10);
  const yDelta = (v: number) => 305 - (v / dmax) * 30;

  const line = (ys: readonly number[]) => ys.map((y, i) => `${i ? "L" : "M"}${xOf(i).toFixed(1)},${y.toFixed(1)}`).join("");
  const step = (ys: readonly number[]) =>
    `M${xOf(0).toFixed(1)},${ys[0]!.toFixed(1)}${ys.map((y, i) => `H${xOf(i).toFixed(1)}V${y.toFixed(1)}`).join("")}`;
  const traces = (t: Trace, dy: number) => [
    line(t.speed.map(ySpeed)),
    line(t.throttle.map(yThrottle)),
    step(t.brake.map((on) => yBrake(on) + dy)),
    step(t.gear.map(yGear)),
  ];

  const s2 = indexAtTime(a, lapA.duration_sector_1 ?? 0);
  const s3 = indexAtTime(a, (lapA.duration_sector_1 ?? 0) + (lapA.duration_sector_2 ?? 0));
  return {
    paths: [
      ...traces(b, 1).map((d) => ({ who: "B" as const, d })),
      ...traces(a, 0).map((d) => ({ who: "A" as const, d })),
      { who: "Δ", d: line(delta.map(yDelta)) },
    ],
    lanes: [
      { y: ySpeed(60), labelY: 20, label: "KM/H" },
      { y: yThrottle(0), labelY: 150, label: "THR %" },
      { y: yBrake(false), labelY: 200, label: "BRK" },
      { y: yGear(1), labelY: 222, label: "GEAR" },
      { y: 335, labelY: 290, label: `Δ ${dmax.toFixed(1)}s` },
    ],
    drs: runs(a.drs).map(([s, e]) => ({ x: xOf(s), w: xOf(e) - xOf(s) })),
    sectors: [
      { x: xOf(s2), labelX: xOf(s2 / 2), label: "S1" },
      { x: xOf(s3), labelX: xOf((s2 + s3) / 2), label: "S2" },
    ],
    zeroY: yDelta(0),
    xOf,
    indexAt,
    deltaAtLine: delta[n - 1]!,
  };
}

const signed = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(3)}s`;

export function readout(a: Trace, b: Trace, i: number | null): string {
  if (i == null) return `Δ at line ${signed(a.time[a.time.length - 1]! - b.time[b.time.length - 1]!)} · hover to scrub`;
  const metres = Math.round((i / (a.time.length - 1)) * a.lengthM);
  return `${metres} m · ${Math.round(a.speed[i]!)} / ${Math.round(b.speed[i]!)} km/h · G${a.gear[i]}/${b.gear[i]} · Δ ${signed(a.time[i]! - b.time[i]!)}`;
}
