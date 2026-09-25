export const sq = (x: number) => x * x;

export const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function median(xs: readonly number[]): number {
  if (xs.length === 0) return Number.NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Median absolute deviation scaled to a normal sd, so one slow stop (a jack failure, a penalty) cannot widen every band. */
export function robustSd(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = median(xs);
  return 1.4826 * median(xs.map((x) => Math.abs(x - m)));
}

/** Standard normal CDF (Abramowitz and Stegun 26.2.17). */
export function phi(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const tail =
    0.3989423 *
    Math.exp((-z * z) / 2) *
    t *
    (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - tail : tail;
}
