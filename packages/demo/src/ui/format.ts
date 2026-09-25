/** 86.345 -> "1:26.345" */
export function formatLapTime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return m > 0 ? `${m}:${s.toFixed(3).padStart(6, "0")}` : s.toFixed(3);
}

/** 1.234 -> "+1.234" */
export function formatGap(seconds: number | null | undefined, digits = 3): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  return `+${seconds.toFixed(digits)}`;
}

/** 3725 -> "1:02:05" */
export function formatClock(seconds: number): string {
  const t = Math.max(0, Math.floor(seconds));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** An estimate: central value with a ± spread and a 0..1 confidence. */
export interface Estimate {
  readonly value: number;
  readonly spread: number;
  readonly confidence: number;
}

/** { value: 21.4, spread: 0.8, confidence: 0.72 } with digits 1 -> "≈21.4 ±0.8 · 72%" */
export function formatEstimate(e: Estimate, digits = 1, unit = ""): string {
  return `≈${e.value.toFixed(digits)}${unit} ±${e.spread.toFixed(digits)}${unit} · ${Math.round(e.confidence * 100)}%`;
}
