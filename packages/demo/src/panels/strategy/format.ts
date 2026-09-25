import type { Normal } from "./types";

/**
 * The panel's only way to print a model output: "≈" value "±" one sd. B's `Predicted` also appends a confidence;
 * the plan table and ghost strip show confidence in their own bar, so cells use these.
 */
export function approx(e: Normal, digits: number, unit = "", signed = false): string {
  const v = e.value.toFixed(digits);
  const sign = signed && e.value >= 0 ? "+" : "";
  return `≈${sign}${v}${unit} ±${e.sd.toFixed(digits)}${unit}`;
}

export function approxPos(e: Normal): string {
  return `≈P${Math.round(e.value)} ±${e.sd.toFixed(1)}`;
}
