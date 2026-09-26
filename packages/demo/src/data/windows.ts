import type { OpenF1Location } from "@f1/core";
import { useEffect } from "react";
import type { OpenF1Rows } from "./openf1";
import { useRaceSource } from "./source";
import { useAsync, type Async } from "./useOpenF1";

export const WINDOW_MS = 30_000;

/** Epoch-aligned, so every caller asking about the same instant shares the gate's cache entry. */
export interface TimeWindow {
  readonly start: number;
  readonly end: number;
}

export function windowsCovering(from: number, to: number): TimeWindow[] {
  const out: TimeWindow[] = [];
  for (let s = Math.floor(from / WINDOW_MS) * WINDOW_MS; s < to; s += WINDOW_MS) out.push({ start: s, end: s + WINDOW_MS });
  return out;
}

const filterOf = (w: TimeWindow) => ({ "date>=": new Date(w.start).toISOString(), "date<": new Date(w.end).toISOString() });

type Sampled = "location" | "car_data";

/**
 * All cars' rows of a sampled endpoint over [from, to), fetched as whole 30 s windows through the source.
 * Not cut at the cursor: readers bound what they draw (positionAt, or cut() for car_data).
 * `prefetch` also requests the window after `to`, so playback never waits on it.
 */
export function useWindowedRows<E extends Sampled>(
  endpoint: E,
  span: { readonly from: number; readonly to: number } | null,
  prefetch = false,
): Async<readonly OpenF1Rows[E][]> {
  const source = useRaceSource();
  const windows = span ? windowsCovering(span.from, span.to) : [];
  const key = span ? `${endpoint}:${source.sessionKey}:${windows.map((w) => w.start).join(",")}` : null;
  const next = windows.at(-1)?.end;
  useEffect(() => {
    if (!prefetch || next === undefined) return;
    const controller = new AbortController();
    source.rows(endpoint, filterOf({ start: next, end: next + WINDOW_MS }), controller.signal).catch(() => {});
    return () => controller.abort();
  }, [prefetch, next, endpoint, source]);
  return useAsync(key, (signal) =>
    Promise.all(windows.map((w) => source.rows(endpoint, filterOf(w), signal))).then((parts) => parts.flat()),
  );
}

/** Real positions trail the cursor by this much, so both ends of every interpolation are known at `at`. */
export const LOCATION_LAG_MS = 500;
/** A car with no sample this close to the drawn instant has no real position (pit garage, dropout). */
const MAX_GAP_MS = 2_000;

export interface Track {
  readonly t: Float64Array;
  readonly x: Float64Array;
  readonly y: Float64Array;
}

export function indexLocations(rows: readonly OpenF1Location[]): ReadonlyMap<number, Track> {
  const by = new Map<number, OpenF1Location[]>();
  for (const r of rows) {
    let list = by.get(r.driver_number);
    if (!list) by.set(r.driver_number, (list = []));
    list.push(r);
  }
  const out = new Map<number, Track>();
  for (const [driver, list] of by) {
    list.sort((a, b) => a.date.localeCompare(b.date));
    out.set(driver, {
      t: Float64Array.from(list, (r) => Date.parse(r.date)),
      x: Float64Array.from(list, (r) => r.x),
      y: Float64Array.from(list, (r) => r.y),
    });
  }
  return out;
}

/**
 * The car's [x, y] at epoch ms `t`, interpolated between the samples around it. Null across a gap, or when
 * the later sample is after `knownUntil` (the cursor), so a position never uses data from the future.
 */
export function positionAt(track: Track, t: number, knownUntil: number): readonly [number, number] | null {
  let lo = 0;
  let hi = track.t.length - 1;
  if (hi < 0 || t < track.t[0]! || t > track.t[hi]!) return null;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (track.t[mid]! <= t) lo = mid;
    else hi = mid;
  }
  const t0 = track.t[lo]!;
  const t1 = track.t[hi]!;
  if (t1 - t0 > MAX_GAP_MS || t1 > knownUntil) return null;
  const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
  return [track.x[lo]! + (track.x[hi]! - track.x[lo]!) * f, track.y[lo]! + (track.y[hi]! - track.y[lo]!) * f];
}
