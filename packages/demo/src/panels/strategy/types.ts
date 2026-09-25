export type Compound = "SOFT" | "MEDIUM" | "HARD" | "INTERMEDIATE" | "WET";

export const DRY_COMPOUNDS: readonly Compound[] = ["SOFT", "MEDIUM", "HARD"];

/** A model output. Every predicted number the panel shows is one of these. */
export interface Normal {
  readonly value: number;
  /** One standard deviation, same unit as value. */
  readonly sd: number;
}

export interface RaceLap {
  readonly lap: number;
  /** Measured lap time in seconds; null when timing did not record it. */
  readonly time: number | null;
  /** Seconds from the race start to crossing the line at the end of this lap. */
  readonly crossedAt: number | null;
  readonly compound: Compound | null;
  /** Laps on this set of tyres at the end of this lap (1 on the first lap of a stint). */
  readonly tyreAge: number;
  readonly stint: number;
  readonly pitIn: boolean;
  readonly pitOut: boolean;
}

export interface RaceDriver {
  readonly number: number;
  readonly code: string;
  readonly color: string;
  /** Indexed by lap number minus one. Ends at the driver's last completed lap. */
  readonly laps: readonly RaceLap[];
}

/** One completed race, parsed once from OpenF1 rows. Laps beyond the replay cursor are never read by the model. */
export interface Race {
  readonly totalLaps: number;
  readonly drivers: readonly RaceDriver[];
  /** Laps the field ran under SC/VSC or red-flag pace, detected from the field's median lap time. */
  readonly neutralLaps: ReadonlySet<number>;
  /** Pit-lane durations observed across the session, seconds, keyed by the in-lap so the model can cut them at the cursor. */
  readonly pitStops: readonly {
    readonly lap: number;
    readonly laneDuration: number;
  }[];
}

export interface CompoundFit {
  readonly compound: Compound;
  /** Seconds per lap of tyre age, fuel-corrected. */
  readonly slope: Normal;
  /** Fresh-tyre pace relative to MEDIUM, seconds. */
  readonly offset: Normal;
  /** Residual standard deviation of a single clean lap, seconds. */
  readonly residual: number;
  readonly cleanLaps: number;
  /** True when the session has no clean laps on this compound yet, so the slope is the prior. */
  readonly prior: boolean;
  /** Tyre age past which each lap adds a cliff penalty: the longer of the prior life and the longest stint seen on this compound. */
  readonly life: number;
}

export interface DegradationModel {
  readonly fuelPerLap: number;
  readonly fits: Readonly<Partial<Record<Compound, CompoundFit>>>;
}
