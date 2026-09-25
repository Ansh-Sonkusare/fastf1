import { type CleanLap, fitOf, lapTime, paceOf } from "./fit";
import { standingsAt } from "./race";
import { median, sq } from "./stats";
import {
  type Compound,
  DRY_COMPOUNDS,
  type DegradationModel,
  type Normal,
  type PlannedStop,
  type Race,
} from "./types";

const SC_LAPS = 3;
const SC_PACE = 1.4;
// The reference's factor: a stop behind the safety car loses about half the green-flag pit loss.

export const SC_PIT_FACTOR = 0.52;
const TWO_STOP_MIN_LAPS = 25;

/** A car at the end of the cursor lap, with its fitted fresh-MEDIUM pace. */
export interface Runner {
  readonly number: number;
  readonly code: string;
  readonly color: string;
  readonly position: number;
  readonly gap: number;
  readonly compound: Compound;
  readonly age: number;
  readonly stint: number;
  readonly used: ReadonlySet<Compound>;
  readonly pace: number;
}

export interface SimContext {
  readonly model: DegradationModel;
  readonly cursor: number;
  readonly totalLaps: number;
  readonly pitLoss: number;
  readonly pitSd: number;
  readonly safetyCar: boolean;
}

/** Laps and summed tyre ages per compound: what a plan's uncertainty is made of. */
export type Exposure = ReadonlyMap<Compound, { readonly laps: number; readonly ages: number }>;

export interface Candidate {
  readonly stops: readonly PlannedStop[];
  readonly time: Normal;
  readonly exposure: Exposure;
}

export function runnersAt(
  race: Race,
  lap: number,
  model: DegradationModel,
  clean: readonly CleanLap[],
): Runner[] {
  const base = standingsAt(race, lap).map(({ driver, position, gapToLeader }) => {
    const now = driver.laps[lap - 1];
    const compound = now.compound ?? "MEDIUM";
    return {
      number: driver.number,
      code: driver.code,
      color: driver.color,
      position,
      gap: gapToLeader,
      compound,
      age: now.tyreAge,
      stint: now.stint,
      used: new Set(driver.laps.flatMap((l) => (l.compound ? [l.compound] : []))),
      pace: paceOf(
        model,
        clean.filter((l) => l.driver === driver.number),
      ),
    };
  });
  const field = median(base.flatMap((r) => (r.pace == null ? [] : [r.pace])));
  return base.map((r) => ({ ...r, pace: r.pace ?? field }));
}

/** Remaining race time from the lap after the cursor to the flag. A stop on lap L is taken at the end of lap L. */
export function simulate(ctx: SimContext, r: Runner, stops: readonly PlannedStop[]): Candidate {
  let compound = r.compound;
  let age = r.age;
  let time = 0;
  let noise = 0;
  const exposure = new Map<Compound, { laps: number; ages: number }>();
  for (let lap = ctx.cursor + 1; lap <= ctx.totalLaps; lap++) {
    age++;
    const sc = ctx.safetyCar && lap <= ctx.cursor + SC_LAPS;
    time += lapTime(ctx.model, r.pace, compound, age, lap) * (sc ? SC_PACE : 1);
    const e = exposure.get(compound) ?? { laps: 0, ages: 0 };
    exposure.set(compound, { laps: e.laps + 1, ages: e.ages + age });
    noise += sq(fitOf(ctx.model, compound).residual);
    const stop = stops.find((s) => s.lap === lap);
    if (stop) {
      time += ctx.pitLoss * (sc ? SC_PIT_FACTOR : 1);
      compound = stop.compound;
      age = 0;
    }
  }
  const model = modelVariance(ctx, r, exposure, new Map());
  return {
    stops,
    time: { value: time, sd: Math.sqrt(model + noise + stops.length * sq(ctx.pitSd)) },
    exposure,
  };
}

/**
 * Variance from the fitted slopes and offsets over the difference of two exposures. Against an empty exposure it is a
 * plan's own model variance; between two plans the shared laps cancel, which is what a cost curve or a Δ should show.
 * The current compound's offset cancels in the driver's pace; a new compound's does not.
 */
function modelVariance(ctx: SimContext, r: Runner, x: Exposure, y: Exposure): number {
  let v = 0;
  for (const c of new Set([...x.keys(), ...y.keys()])) {
    const f = fitOf(ctx.model, c);
    const dx = x.get(c) ?? { laps: 0, ages: 0 };
    const dy = y.get(c) ?? { laps: 0, ages: 0 };
    v += sq(f.slope.sd * (dx.ages - dy.ages));
    if (c !== r.compound) v += sq(f.offset.sd * (dx.laps - dy.laps));
  }
  return v;
}

/** One sd of `x`'s time minus `y`'s, for the same driver in the same race. */
export function spreadBetween(ctx: SimContext, r: Runner, x: Candidate, y: Candidate): number {
  const stops = Math.abs(x.stops.length - y.stops.length);
  return Math.sqrt(modelVariance(ctx, r, x.exposure, y.exposure) + stops * sq(ctx.pitSd));
}

/** A dry race must use two dry compounds; running an intermediate or wet waives the rule. */
function legal(used: ReadonlySet<Compound>, stops: readonly PlannedStop[]): boolean {
  const all = new Set([...used, ...stops.map((s) => s.compound)]);
  return (
    all.has("INTERMEDIATE") || all.has("WET") || DRY_COMPOUNDS.filter((c) => all.has(c)).length >= 2
  );
}

// A pit wall takes a known tyre over an unknown one: plans rank on mean time plus half a standard deviation.
const RISK = 0.5;
export const score = (t: Normal) => t.value + RISK * t.sd;

export function bestOf(cands: readonly (Candidate | null)[]): Candidate | null {
  return cands.reduce<Candidate | null>(
    (b, c) => (c && (!b || score(c.time) < score(b.time)) ? c : b),
    null,
  );
}

export function stopAt(
  ctx: SimContext,
  r: Runner,
  lap: number,
  before: readonly PlannedStop[] = [],
): Candidate | null {
  return bestOf(
    DRY_COMPOUNDS.map((compound) => [...before, { lap, compound }])
      .filter((stops) => legal(r.used, stops))
      .map((stops) => simulate(ctx, r, stops)),
  );
}

export function stayOut(ctx: SimContext, r: Runner): Candidate | null {
  return legal(r.used, []) ? simulate(ctx, r, []) : null;
}

export function oneStops(ctx: SimContext, r: Runner): Candidate[] {
  const out: Candidate[] = [];
  for (let lap = ctx.cursor + 1; lap < ctx.totalLaps; lap++) {
    const c = stopAt(ctx, r, lap);
    if (c) out.push(c);
  }
  return out;
}

/** Coarse grid: every other lap, middle and final stints of at least four laps. */
export function twoStop(ctx: SimContext, r: Runner): Candidate | null {
  if (ctx.totalLaps - ctx.cursor < TWO_STOP_MIN_LAPS) return null;
  const cands: (Candidate | null)[] = [];
  for (let a = ctx.cursor + 1; a < ctx.totalLaps; a += 2)
    for (let b = a + 4; b <= ctx.totalLaps - 4; b += 2)
      for (const compound of DRY_COMPOUNDS) cands.push(stopAt(ctx, r, b, [{ lap: a, compound }]));
  return bestOf(cands);
}

export function bestPlanTime(ctx: SimContext, r: Runner): Normal {
  return (bestOf([stayOut(ctx, r), ...oneStops(ctx, r), twoStop(ctx, r)]) as Candidate).time;
}
