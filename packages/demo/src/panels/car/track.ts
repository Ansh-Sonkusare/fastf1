import type { CarData, OpenF1Lap, OpenF1Location, RaceControl } from "@f1/core";
import { ms } from "./order";

export type Point = readonly [number, number];
export type Range = readonly [number, number];

export interface TrackGeometry {
  readonly points: readonly Point[];
  readonly sectorStarts: readonly [number, number];
  readonly drs: readonly Range[];
}

/** OpenF1 car_data `drs`: 10, 12 and 14 mean the flap is open. */
export const isDrsOpen = (drs: number | null | undefined) => drs != null && drs >= 10;

export function pickReferenceLap(laps: readonly OpenF1Lap[]): OpenF1Lap | null {
  const byLap = new Map<number, OpenF1Lap[]>();
  for (const l of laps) {
    if (l.lap_number < 3 || l.date_start == null) continue;
    const group = byLap.get(l.lap_number);
    if (group) group.push(l);
    else byLap.set(l.lap_number, [l]);
  }
  let best: { lap: OpenF1Lap; gap: number } | null = null;
  for (const group of byLap.values()) {
    const sorted = [...group].sort((a, b) => ms(a.date_start!) - ms(b.date_start!));
    for (let i = 1; i < sorted.length; i++) {
      const ahead = sorted[i - 1]!;
      const lap = sorted[i]!;
      if (lap.lap_duration == null || ahead.lap_duration == null) continue;
      if (lap.duration_sector_1 == null || lap.duration_sector_2 == null || lap.is_pit_out_lap) continue;
      const atStart = (ms(lap.date_start!) - ms(ahead.date_start!)) / 1000;
      const atEnd = atStart + lap.lap_duration - ahead.lap_duration;
      const gap = Math.max(atStart, atEnd);
      if (Math.min(atStart, atEnd) <= 0.2 || gap >= 1) continue;
      if (!best || gap < best.gap || (gap === best.gap && lap.lap_number < best.lap.lap_number)) best = { lap, gap };
    }
  }
  return best?.lap ?? null;
}

export function runs(flags: readonly boolean[]): Range[] {
  const out: Range[] = [];
  let start = -1;
  flags.forEach((on, i) => {
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      out.push([start, i - 1]);
      start = -1;
    }
  });
  if (start >= 0) out.push([start, flags.length - 1]);
  return out;
}

export function buildTrackGeometry(lap: OpenF1Lap, location: readonly OpenF1Location[], carData: readonly CarData[]): TrackGeometry {
  const t0 = ms(lap.date_start!);
  const t1 = (lap.lap_duration ?? 0) * 1000;
  const samples = location
    .filter((p) => p.x !== 0 || p.y !== 0)
    .map((p) => ({ t: ms(p.date) - t0, p: [p.x, p.y] as Point }))
    .filter(({ t }) => t >= 0 && t <= t1)
    .sort((a, b) => a.t - b.t);
  const firstAfter = (t: number) => {
    const i = samples.findIndex((s) => s.t >= t);
    return i < 0 ? samples.length - 1 : i;
  };
  const s1 = (lap.duration_sector_1 ?? 0) * 1000;
  const s2 = s1 + (lap.duration_sector_2 ?? 0) * 1000;

  const car = carData.map((c) => ({ t: ms(c.date) - t0, open: isDrsOpen(c.drs) })).sort((a, b) => a.t - b.t);
  let j = 0;
  const open = samples.map(({ t }) => {
    while (j + 1 < car.length && Math.abs(car[j + 1]!.t - t) <= Math.abs(car[j]!.t - t)) j++;
    return car[j]?.open ?? false;
  });

  return {
    points: samples.map((s) => s.p),
    sectorStarts: [firstAfter(s1), firstAfter(s2)],
    drs: runs(open).filter(([a, b]) => b > a),
  };
}

export type YellowLevel = "YELLOW" | "DOUBLE YELLOW";

export function activeYellows(raceControl: readonly RaceControl[], at: string): Map<number, YellowLevel> {
  const until = ms(at);
  const active = new Map<number, YellowLevel>();
  const rows = raceControl.filter((r) => ms(r.date) <= until).sort((a, b) => ms(a.date) - ms(b.date));
  for (const r of rows) {
    if (r.scope === "Sector" && r.sector != null) {
      if (r.flag === "YELLOW" || r.flag === "DOUBLE YELLOW") active.set(r.sector, r.flag);
      else if (r.flag === "CLEAR") active.delete(r.sector);
    } else if (r.scope === "Track" && (r.flag === "CLEAR" || r.flag === "GREEN")) {
      active.clear();
    }
  }
  return active;
}

export function yellowsDuring(raceControl: readonly RaceControl[], start: string, end: string): Map<number, YellowLevel> {
  const during = activeYellows(raceControl, start);
  const [from, to] = [ms(start), ms(end)];
  for (const r of raceControl) {
    const t = ms(r.date);
    if (t <= from || t > to || r.scope !== "Sector" || r.sector == null) continue;
    if (r.flag === "DOUBLE YELLOW" || (r.flag === "YELLOW" && !during.has(r.sector))) during.set(r.sector, r.flag);
  }
  return new Map([...during].sort(([a], [b]) => a - b));
}

export interface MarshalSector {
  readonly number: number;
  readonly trackPosition: { readonly x: number; readonly y: number };
}

export function marshalSpans(points: readonly Point[], sectors: readonly MarshalSector[]): Map<number, Range> {
  const nearest = ({ x, y }: MarshalSector["trackPosition"]) => {
    let best = 0;
    let bestD = Number.POSITIVE_INFINITY;
    points.forEach(([px, py], i) => {
      const d = (px - x) ** 2 + (py - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };
  const sorted = [...sectors].sort((a, b) => a.number - b.number);
  const starts = sorted.map((s) => nearest(s.trackPosition));
  return new Map(sorted.map((s, k) => [s.number, [starts[k]!, starts[(k + 1) % starts.length]!] as Range]));
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly pad: number;
}

export function fitToView(points: readonly Point[], rotationDeg: number, view: Viewport): (p: Point) => Point {
  const r = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const turn = ([x, y]: Point): Point => [x * cos - y * sin, -(x * sin + y * cos)];
  const turned = points.map(turn);
  const xs = turned.map((p) => p[0]);
  const ys = turned.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = Math.min((view.width - 2 * view.pad) / (maxX - minX || 1), (view.height - 2 * view.pad) / (maxY - minY || 1));
  const ox = (view.width - (maxX - minX) * scale) / 2;
  const oy = (view.height - (maxY - minY) * scale) / 2;
  return (p) => {
    const [x, y] = turn(p);
    return [ox + (x - minX) * scale, oy + (y - minY) * scale];
  };
}

const fmt = ([x, y]: Point) => `${x.toFixed(1)},${y.toFixed(1)}`;

export function pathThrough(points: readonly Point[], [from, to]: Range): string {
  const idx: number[] = [];
  for (let i = from; ; i = (i + 1) % points.length) {
    idx.push(i);
    if (i === to || idx.length > points.length) break;
  }
  return `M${idx.map((i) => fmt(points[i]!)).join("L")}`;
}

export interface CarPosition {
  readonly number: number;
  readonly index: number;
}

/**
 * Each car's index along the reference line at `at`, from lap start and sector times. The lap in progress has
 * no duration yet (the cursor hides it), so it runs at the pace of the car's latest completed lap, anchored on any sector
 * lines already crossed, and waits just short of the line if the car is slower than that. A lap still running at twice
 * that pace means the car stopped, so it has no position. Under a red flag that empties the map until the restart.
 */
export function carPositions(laps: readonly OpenF1Lap[], at: string, geometry: TrackGeometry): CarPosition[] {
  const t = ms(at);
  const n = geometry.points.length;
  const [s2, s3] = geometry.sectorStarts;
  const completed = laps.filter((l) => l.lap_duration != null);
  const paceBefore = (l: OpenF1Lap) =>
    completed.reduce<OpenF1Lap | undefined>(
      (best, c) => (c.driver_number === l.driver_number && c.lap_number < l.lap_number && c.lap_number > (best?.lap_number ?? 0) ? c : best),
      undefined,
    );
  const out = new Map<number, CarPosition & { lap: number }>();
  for (const l of laps) {
    const running = l.lap_duration == null;
    const prev = running ? paceBefore(l) : undefined;
    const lapDuration = l.lap_duration ?? prev?.lap_duration;
    if (l.date_start == null || lapDuration == null) continue;
    const elapsed = (t - ms(l.date_start)) / 1000;
    if (running && elapsed > lapDuration * 2) continue;
    const into = Math.min(elapsed, running ? lapDuration * 0.999 : Number.POSITIVE_INFINITY);
    if (into < 0 || into >= lapDuration) continue;
    const d1 = l.duration_sector_1 ?? prev?.duration_sector_1;
    const d2 = l.duration_sector_2 ?? prev?.duration_sector_2;
    const spans: [number, number, number][] =
      d1 != null && d2 != null && d1 + d2 < lapDuration
        ? [
            [0, d1, s2],
            [d1, d1 + d2, s3],
            [d1 + d2, lapDuration, n],
          ]
        : [[0, lapDuration, n]];
    let from = 0;
    for (const [t0, t1, to] of spans) {
      if (into < t1) {
        if ((out.get(l.driver_number)?.lap ?? 0) < l.lap_number) {
          out.set(l.driver_number, {
            number: l.driver_number,
            lap: l.lap_number,
            index: (from + ((into - t0) / (t1 - t0)) * (to - from)) % n,
          });
        }
        break;
      }
      from = to;
    }
  }
  return [...out.values()].map(({ number, index }) => ({ number, index })).sort((a, b) => a.number - b.number);
}

/** Fractional index along the closed reference line of the point nearest `p`, projected onto its segment. */
export function indexNear(points: readonly Point[], [px, py]: Point): number {
  let best = 0;
  let bestD = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i]!;
    const [bx, by] = points[(i + 1) % points.length]!;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const f = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    const d = (ax + f * dx - px) ** 2 + (ay + f * dy - py) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i + f;
    }
  }
  return best % points.length;
}

/**
 * Simulated positions with each car that has a real location moved onto the line where it really was.
 * Only running cars move: a retired car still reports a location from the garage or wherever it stopped.
 */
export function withRealPositions(
  simulated: readonly CarPosition[],
  real: ReadonlyMap<number, Point>,
  points: readonly Point[],
): CarPosition[] {
  return simulated.map((s) => {
    const p = real.get(s.number);
    return p ? { number: s.number, index: indexNear(points, p) } : s;
  });
}

export function pointAt(points: readonly Point[], index: number): Point {
  const i = Math.floor(index);
  const f = index - i;
  const [ax, ay] = points[i % points.length]!;
  const [bx, by] = points[(i + 1) % points.length]!;
  return [ax + (bx - ax) * f, ay + (by - ay) * f];
}

export interface CarDot {
  readonly number: number;
  readonly at: Point;
  readonly role: "A" | "B" | null;
  readonly labelled: boolean;
}

export interface TrackView {
  readonly outline: string;
  readonly sectors: readonly {
    readonly label: string;
    readonly d: string;
    readonly labelAt: Point;
  }[];
  readonly drs: readonly string[];
  readonly yellows: readonly {
    readonly sector: number;
    readonly level: YellowLevel;
    readonly d: string;
  }[];
  readonly startFinish: Point;
  readonly cars: readonly CarDot[];
}

export interface TrackViewInput {
  readonly geometry: TrackGeometry;
  readonly rotationDeg: number;
  readonly marshalSectors: readonly MarshalSector[];
  readonly yellows: ReadonlyMap<number, YellowLevel>;
  readonly positions: readonly CarPosition[];
  readonly focus: { readonly a: number | null; readonly b: number | null };
  readonly order: readonly number[];
}

export const TRACK_VIEW: Viewport = { width: 460, height: 300, pad: 22 };

export function trackView(input: TrackViewInput): TrackView {
  const { geometry, focus } = input;
  const project = fitToView(geometry.points, input.rotationDeg, TRACK_VIEW);
  const pts = geometry.points.map(project);
  const last = pts.length - 1;
  const [s2, s3] = geometry.sectorStarts;
  const labelAt = (from: number, to: number): Point => {
    const mid = pts[Math.floor((from + to) / 2)]!;
    const [cx, cy] = [TRACK_VIEW.width / 2, TRACK_VIEW.height / 2];
    const len = Math.hypot(mid[0] - cx, mid[1] - cy) || 1;
    return [mid[0] + ((mid[0] - cx) / len) * 16, mid[1] + ((mid[1] - cy) / len) * 16 + 4];
  };
  const spans = marshalSpans(geometry.points, input.marshalSectors);

  const top = new Set(input.order.slice(0, 3));
  const weight = (n: number) => (n === focus.a ? 2 : n === focus.b ? 1 : 0);
  const cars = input.positions
    .map(({ number, index }): CarDot => {
      const role = number === focus.a ? "A" : number === focus.b ? "B" : null;
      return { number, at: pointAt(pts, index), role, labelled: role !== null || top.has(number) };
    })
    .sort((x, y) => weight(x.number) - weight(y.number) || x.number - y.number);

  return {
    outline: `M${pts.map(fmt).join("L")}Z`,
    sectors: [
      { label: "S1", d: pathThrough(pts, [0, s2]), labelAt: labelAt(0, s2) },
      { label: "S2", d: pathThrough(pts, [s2, s3]), labelAt: labelAt(s2, s3) },
      {
        label: "S3",
        d: `${pathThrough(pts, [s3, last])}L${fmt(pts[0]!)}`,
        labelAt: labelAt(s3, last),
      },
    ],
    drs: geometry.drs.map((r) => pathThrough(pts, r)),
    yellows: [...input.yellows]
      .filter(([sector]) => spans.has(sector))
      .sort(([a], [b]) => a - b)
      .map(([sector, level]) => ({ sector, level, d: pathThrough(pts, spans.get(sector)!) })),
    startFinish: pts[0]!,
    cars,
  };
}
