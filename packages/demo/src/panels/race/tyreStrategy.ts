import { Stint } from "@f1/core";

export interface TyreStintViewModel {
  driverNumber: number;
  stintNumber: number;
  compound: string; // "SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"
  lapStart: number;
  lapEnd: number;
  duration: number; // lap count
  tyreAgeAtStart: number | null; // in laps
  estimatedAgeAtEnd: number | null; // calculated: ageAtStart + duration
}

/**
 * Shape stint data from OpenF1 into view model.
 * Stints represent tyre strategy: which compound at which lap range.
 */
export function shapeTyreStints(
  stints: Stint[],
  sessionKey: number
): TyreStintViewModel[] {
  return stints
    .filter((s) => s.session_key === sessionKey)
    .map((s) => ({
      driverNumber: s.driver_number,
      stintNumber: s.stint_number,
      compound: s.compound,
      lapStart: s.lap_start,
      lapEnd: s.lap_end,
      duration: s.lap_end - s.lap_start + 1,
      tyreAgeAtStart: s.tyre_age_at_start,
      estimatedAgeAtEnd:
        s.tyre_age_at_start !== null && s.tyre_age_at_start !== undefined
          ? s.tyre_age_at_start + (s.lap_end - s.lap_start)
          : null,
    }))
    .sort(
      (a, b) =>
        a.driverNumber - b.driverNumber || a.stintNumber - b.stintNumber
    );
}

/**
 * Get stint color based on compound
 */
export function getCompoundColor(compound: string): string {
  const normalizedCompound = compound.toUpperCase();
  const colorMap: Record<string, string> = {
    SOFT: "#ff5a4f", // red
    MEDIUM: "#e6c229", // yellow
    HARD: "#f5f5f5", // white/gray
    INTERMEDIATE: "#3ecf6e", // green
    WET: "#6fd3e8", // cyan
  };
  return colorMap[normalizedCompound] || "#aeb5bf"; // gray default
}

/**
 * Get compound abbreviation (one letter)
 */
export function getCompoundAbbr(compound: string): string {
  const normalizedCompound = compound.toUpperCase();
  const abbrMap: Record<string, string> = {
    SOFT: "S",
    MEDIUM: "M",
    HARD: "H",
    INTERMEDIATE: "I",
    WET: "W",
  };
  return abbrMap[normalizedCompound] || compound[0].toUpperCase();
}

/**
 * Get all unique compounds used in a stint list for legend
 */
export function getUniqueCompounds(stints: TyreStintViewModel[]): string[] {
  const compounds = new Set<string>();
  stints.forEach((s) => compounds.add(s.compound));
  return Array.from(compounds).sort();
}
