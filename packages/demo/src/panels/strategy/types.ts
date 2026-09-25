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

export interface PlannedStop {
  readonly lap: number;
  readonly compound: Compound;
}

export interface FocusState {
  readonly number: number;
  readonly code: string;
  readonly color: string;
  readonly position: number;
  readonly compound: Compound | null;
  readonly tyreAge: number;
  /** Measured gap to the leader at the end of the cursor lap, seconds. */
  readonly gapToLeader: number;
}

export interface GhostCar {
  readonly code: string;
  readonly color: string;
  readonly gapToLeader: number;
  /** The car directly ahead of or behind the rejoin point. */
  readonly neighbour: boolean;
}

export interface GhostRejoin {
  readonly pitLoss: number;
  readonly position: Normal;
  readonly gapToLeader: Normal;
  readonly ahead: { readonly code: string; readonly margin: number } | null;
  readonly behind: { readonly code: string; readonly margin: number } | null;
  readonly clearAir: boolean;
  /** Probability the rejoin position holds, 0..1. */
  readonly probability: number;
  readonly field: readonly GhostCar[];
}

export interface PitWindowPoint {
  readonly lap: number;
  readonly compound: Compound;
  /** Race time over the best plan, seconds. */
  readonly cost: Normal;
}

export interface PitWindow {
  readonly points: readonly PitWindowPoint[];
  readonly optimal: PitWindowPoint;
  /** Cost of never stopping; null when A still owes a second dry compound. */
  readonly stayOut: Normal | null;
  readonly undercut: readonly [number, number] | null;
  readonly overcut: readonly [number, number] | null;
}

export interface PlanOutcome {
  readonly name: string;
  readonly stops: readonly PlannedStop[];
  readonly finish: Normal;
  /** Race time over the best plan, seconds. */
  readonly delta: Normal;
  readonly confidence: number;
  readonly best: boolean;
}

export type AlertKind = "THREAT" | "OPPORTUNITY" | "DEGRADATION";

export interface StrategyAlert {
  readonly kind: AlertKind;
  readonly title: string;
  readonly body: string;
  readonly probability: number;
}

export interface StrategyInputs {
  readonly lap: number;
  readonly focus: number;
  readonly pitLoss: number;
  readonly safetyCar: boolean;
}

export interface Strategy {
  readonly lap: number;
  readonly totalLaps: number;
  readonly focus: FocusState;
  readonly model: DegradationModel;
  readonly ghost: GhostRejoin;
  readonly window: PitWindow;
  readonly plans: readonly PlanOutcome[];
  readonly alerts: readonly StrategyAlert[];
  /** A's measured fuel-corrected laps, for the degradation chart. */
  readonly measured: readonly {
    readonly tyreAge: number;
    readonly time: number;
    readonly compound: Compound;
    readonly currentStint: boolean;
  }[];
  /** A's fuel-corrected fresh-tyre pace on MEDIUM, seconds; anchors the degradation curves. */
  readonly basePace: Normal;
}
