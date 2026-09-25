import { lapTime } from "./fit";
import type { Compound, Strategy } from "./types";

export interface Box {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

export const linear =
  (d0: number, d1: number, r0: number, r1: number) =>
  (v: number): number =>
    d1 === d0 ? r0 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

const pt = (x: number, y: number) => `${x.toFixed(1)},${y.toFixed(1)}`;

export function linePath(xs: readonly number[], ys: readonly number[]): string {
  return xs.map((x, i) => `${i ? "L" : "M"}${pt(x, ys[i])}`).join("");
}

/** Closed band between an upper and a lower line over the same xs. */
export function bandPath(
  xs: readonly number[],
  hi: readonly number[],
  lo: readonly number[],
): string {
  const back = xs.map((_, i) => xs.length - 1 - i);
  return `${linePath(xs, hi)}${back.map((i) => `L${pt(xs[i], lo[i])}`).join("")}Z`;
}

/** Evenly spaced round ticks covering [lo, hi]. */
export function ticks(lo: number, hi: number, count: number): number[] {
  const raw = (hi - lo) / Math.max(1, count - 1);
  const step = [1, 2, 5, 10, 20].find((s) => s >= raw) ?? Math.ceil(raw);
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(v);
  return out;
}

export const WINDOW_BOX: Box = { x0: 40, x1: 610, y0: 194, y1: 18 };
export const WINDOW_MAX_COST = 16;

export function windowChart(s: Strategy) {
  const { points, optimal, stayOut, undercut, overcut } = s.window;
  const first = points[0]?.lap ?? s.lap + 1;
  const last = points[points.length - 1]?.lap ?? s.totalLaps;
  const x = linear(s.lap, last, WINDOW_BOX.x0, WINDOW_BOX.x1);
  const y = (c: number) =>
    linear(
      0,
      WINDOW_MAX_COST,
      WINDOW_BOX.y0,
      WINDOW_BOX.y1,
    )(Math.min(Math.max(c, 0), WINDOW_MAX_COST));
  const xs = points.map((p) => x(p.lap));
  const zone = (from: number, to: number, kind: "UNDERCUT" | "OPTIMAL" | "OVERCUT") => {
    const x0 = x(Math.max(first, from) - 0.5);
    const w = x(Math.min(last, to) + 0.5) - x0;
    return { kind, x: x0, w, labelled: kind === "OPTIMAL" || w >= 64 };
  };
  const zones = [
    undercut && undercut[0] <= optimal.lap - 2 && zone(undercut[0], optimal.lap - 2, "UNDERCUT"),
    zone(optimal.lap - 1, optimal.lap + 1, "OPTIMAL"),
    overcut && overcut[1] >= optimal.lap + 2 && zone(optimal.lap + 2, overcut[1], "OVERCUT"),
  ].filter((z) => !!z);
  return {
    x,
    y,
    curve: linePath(
      xs,
      points.map((p) => y(p.cost.value)),
    ),
    band: bandPath(
      xs,
      points.map((p) => y(p.cost.value + p.cost.sd)),
      points.map((p) => y(p.cost.value - p.cost.sd)),
    ),
    zones,
    optimal: { x: x(optimal.lap), y: y(optimal.cost.value) },
    stayOut: stayOut && { y: y(stayOut.value) },
    now: x(s.lap),
    xTicks: ticks(s.lap, last, 6).map((l) => ({ x: x(l), label: `L${l}` })),
    yTicks: ticks(0, WINDOW_MAX_COST, 5).map((c) => ({ y: y(c), label: `+${c}` })),
  };
}

export const DEG_BOX: Box = { x0: 40, x1: 392, y0: 194, y1: 16 };
const DEG_SPAN_S = 4.5;

/** Fuel-corrected lap time against tyre age for each dry compound the model knows, anchored on A's pace. */
export function degradationChart(s: Strategy) {
  const maxAge = Math.max(40, s.focus.tyreAge + 10);
  const ages = Array.from({ length: maxAge / 2 + 1 }, (_, i) => i * 2);
  const fits = (["SOFT", "MEDIUM", "HARD"] as const).flatMap((c) => {
    const f = s.model.fits[c];
    return f ? [f] : [];
  });
  const curves = fits.map((f) => {
    const mid = ages.map((a) => lapTime(s.model, s.basePace.value, f.compound, a, 1));
    const sd = ages.map((a) =>
      Math.hypot(f.slope.sd * a, f.offset.sd, s.basePace.sd, f.residual / 2),
    );
    return { fit: f, mid, sd };
  });
  const floor = Math.min(...curves.map((c) => c.mid[0]), ...s.measured.map((m) => m.time)) - 0.3;
  const x = linear(0, maxAge, DEG_BOX.x0, DEG_BOX.x1);
  const y = (t: number) =>
    linear(floor, floor + DEG_SPAN_S, DEG_BOX.y0, DEG_BOX.y1)(Math.min(t, floor + DEG_SPAN_S));
  const xs = ages.map(x);
  return {
    x,
    now: x(s.focus.tyreAge),
    curves: curves.map(({ fit, mid, sd }) => {
      const visible = mid.filter((t) => t < floor + DEG_SPAN_S - 0.2).length - 1;
      const end = Math.max(0, visible);
      return {
        compound: fit.compound as Compound,
        prior: fit.prior,
        d: linePath(xs, mid.map(y)),
        band: bandPath(
          xs,
          mid.map((t, i) => y(t + sd[i])),
          mid.map((t, i) => y(t - sd[i])),
        ),
        label: { x: xs[end] + 4, y: y(mid[end]) + 3 },
      };
    }),
    dots: s.measured
      .filter((m) => m.tyreAge <= maxAge && m.time < floor + DEG_SPAN_S)
      .map((m) => ({
        x: x(m.tyreAge),
        y: y(m.time),
        compound: m.compound,
        current: m.currentStint,
      })),
    xTicks: ticks(0, maxAge, 5).map((a) => ({ x: x(a), label: String(a) })),
    yTicks: ticks(Math.ceil(floor), floor + DEG_SPAN_S, 5).map((t) => ({
      y: y(t),
      label: t.toFixed(0),
    })),
  };
}
