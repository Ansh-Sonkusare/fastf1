import { detectNeutralLaps, standingsAt } from "./race";
import { mean, median, sq } from "./stats";
import {
  type Compound,
  type CompoundFit,
  DRY_COMPOUNDS,
  type DegradationModel,
  type Normal,
  type Race,
} from "./types";

export const FUEL_PER_LAP = 0.055;
const PRIOR_SLOPE: Partial<Record<Compound, number>> = {
  SOFT: 0.08,
  MEDIUM: 0.05,
  HARD: 0.03,
};
const PRIOR_OFFSET: Partial<Record<Compound, number>> = {
  SOFT: -0.6,
  MEDIUM: 0,
  HARD: 0.5,
};
const PRIOR_OFFSET_SD = 0.4;
const FALLBACK_RESIDUAL = 0.5;
const OUTLIER = 1.07;
const MIN_STINT_LAPS = 3;
const TRAFFIC_S = 1.5;
const PRIOR_LIFE: Partial<Record<Compound, number>> = { SOFT: 15, MEDIUM: 28, HARD: 40 };
// Seconds added per lap for every lap a set runs past its life, so no plan rides a set far beyond a typical Pirelli stint.
export const CLIFF_PER_LAP = 0.5;

/** A lap that feeds the degradation fit; `time` is fuel-corrected to lap-1 fuel. */
export interface CleanLap {
  readonly driver: number;
  readonly stint: number;
  readonly compound: Compound;
  readonly age: number;
  readonly time: number;
}

/** The race as the pit wall saw it at the end of `lap`. Neutral laps are re-detected so later laps cannot move the threshold. */
export function visible(race: Race, lap: number): Race {
  const drivers = race.drivers.map((d) => ({
    ...d,
    laps: d.laps.slice(0, lap),
  }));
  return {
    ...race,
    drivers,
    neutralLaps: detectNeutralLaps(drivers),
    pitStops: race.pitStops.filter((p) => p.lap <= lap),
  };
}

/** Driver-laps that ended within TRAFFIC_S of the car ahead on the road: dirty-air pace says nothing about the tyre. */
function trafficLaps(race: Race): Set<string> {
  const out = new Set<string>();
  for (let lap = 1; lap <= race.totalLaps; lap++) {
    const order = standingsAt(race, lap);
    order.forEach((s, i) => {
      if (i > 0 && s.gapToLeader - order[i - 1].gapToLeader < TRAFFIC_S)
        out.add(`${s.driver.number}:${lap}`);
    });
  }
  return out;
}

export function cleanLaps(race: Race): CleanLap[] {
  const traffic = trafficLaps(race);
  return race.drivers.flatMap((d) => {
    const typical = median(d.laps.flatMap((l) => (l.lap > 1 && l.time != null ? [l.time] : [])));
    return d.laps.flatMap((l) =>
      l.lap === 1 ||
      l.pitIn ||
      l.pitOut ||
      l.time == null ||
      l.compound == null ||
      race.neutralLaps.has(l.lap) ||
      traffic.has(`${d.number}:${l.lap}`) ||
      l.time > OUTLIER * typical
        ? []
        : [
            {
              driver: d.number,
              stint: l.stint,
              compound: l.compound,
              age: l.tyreAge,
              time: l.time + FUEL_PER_LAP * (l.lap - 1),
            },
          ],
    );
  });
}

export function fitDegradation(race: Race, lap: number): DegradationModel {
  const view = visible(race, lap);
  return fitModel(cleanLaps(view), longestStints(view));
}

export function longestStints(race: Race): Map<Compound, number> {
  const out = new Map<Compound, number>();
  for (const l of race.drivers.flatMap((d) => d.laps))
    if (l.compound) out.set(l.compound, Math.max(out.get(l.compound) ?? 0, l.tyreAge));
  return out;
}

interface Intercept {
  readonly driver: number;
  readonly compound: Compound;
  readonly value: number;
}

export function fitModel(
  clean: readonly CleanLap[],
  longest: ReadonlyMap<Compound, number>,
): DegradationModel {
  const byStint = new Map<string, CleanLap[]>();
  for (const l of clean) {
    const key = `${l.driver}:${l.stint}`;
    byStint.set(key, [...(byStint.get(key) ?? []), l]);
  }
  const usable = [...byStint.values()].filter((s) => s.length >= MIN_STINT_LAPS);
  const compounds = [...new Set([...DRY_COMPOUNDS, ...usable.map((s) => s[0].compound)])];
  const slopes = new Map<Compound, { slope: Normal; residual: number; n: number }>();
  const intercepts: Intercept[] = [];
  let ssrAll = 0;
  let dofAll = 0;
  for (const c of compounds) {
    const groups = usable
      .filter((s) => s[0].compound === c)
      .map((g) => ({
        g,
        ma: mean(g.map((l) => l.age)),
        mt: mean(g.map((l) => l.time)),
      }));
    const laps = groups.flatMap(({ g, ma, mt }) =>
      g.map((l) => ({ da: l.age - ma, dt: l.time - mt })),
    );
    const sxx = laps.reduce((a, l) => a + sq(l.da), 0);
    if (sxx === 0) continue;
    const slope = laps.reduce((a, l) => a + l.da * l.dt, 0) / sxx;
    const ssr = laps.reduce((a, l) => a + sq(l.dt - slope * l.da), 0);
    const dof = Math.max(1, laps.length - groups.length - 1);
    ssrAll += ssr;
    dofAll += dof;
    const residual = Math.sqrt(ssr / dof);
    slopes.set(c, {
      slope: { value: slope, sd: residual / Math.sqrt(sxx) },
      residual,
      n: laps.length,
    });
    for (const { g, ma, mt } of groups)
      intercepts.push({
        driver: g[0].driver,
        compound: c,
        value: mt - slope * ma,
      });
  }
  const pooled = dofAll > 0 ? Math.sqrt(ssrAll / dofAll) : FALLBACK_RESIDUAL;
  const offsets = fitOffsets(intercepts);
  // The priors fix how compounds rank against each other; the fitted compounds set how hard this circuit is on tyres.
  const ratios = [...slopes].flatMap(([c, s]) =>
    PRIOR_SLOPE[c] ? [s.slope.value / (PRIOR_SLOPE[c] as number)] : [],
  );
  const scale = ratios.length > 0 ? Math.max(0.5, mean(ratios)) : 1;
  const fits: Partial<Record<Compound, CompoundFit>> = {};
  for (const c of compounds) {
    const s = slopes.get(c);
    const prior = PRIOR_SLOPE[c] ?? 0.05;
    fits[c] = {
      compound: c,
      slope: s
        ? shrink(s.slope, { value: prior * scale, sd: prior })
        : { value: prior * scale, sd: prior },
      offset: offsets.get(c) ?? {
        value: PRIOR_OFFSET[c] ?? 0,
        sd: c === "MEDIUM" ? 0 : PRIOR_OFFSET_SD,
      },
      residual: s?.residual ?? pooled,
      cleanLaps: s?.n ?? 0,
      prior: !s,
      life: Math.max(PRIOR_LIFE[c] ?? 30, longest.get(c) ?? 0),
    };
  }
  return { fuelPerLap: FUEL_PER_LAP, fits };
}

/**
 * Compound offsets vs MEDIUM from an additive driver + compound model on stint intercepts, solved by backfitting.
 * Plain per-driver demeaning would halve the SOFT gap for drivers who ran SOFT-HARD and never MEDIUM.
 */
function fitOffsets(intercepts: readonly Intercept[]): Map<Compound, Normal> {
  const kinds = new Map<number, Set<Compound>>();
  for (const i of intercepts)
    kinds.set(i.driver, (kinds.get(i.driver) ?? new Set<Compound>()).add(i.compound));
  const rows = intercepts.filter((i) => (kinds.get(i.driver)?.size ?? 0) >= 2);
  if (!rows.some((r) => r.compound === "MEDIUM")) return new Map();
  const avgBy = <K>(key: (r: Intercept) => K, val: (r: Intercept) => number) => {
    const acc = new Map<K, number[]>();
    for (const r of rows) acc.set(key(r), [...(acc.get(key(r)) ?? []), val(r)]);
    return new Map([...acc].map(([k, v]) => [k, mean(v)]));
  };
  let off = new Map<Compound, number>(rows.map((r) => [r.compound, 0]));
  let level = new Map<number, number>();
  for (let i = 0; i < 200; i++) {
    const o = off;
    level = avgBy(
      (r) => r.driver,
      (r) => r.value - (o.get(r.compound) ?? 0),
    );
    const l = level;
    const raw = avgBy(
      (r) => r.compound,
      (r) => r.value - (l.get(r.driver) ?? 0),
    );
    const anchor = raw.get("MEDIUM") ?? 0;
    off = new Map([...raw].map(([c, v]) => [c, v - anchor]));
  }
  const count = (c: Compound) => rows.filter((r) => r.compound === c).length;
  const dof = rows.length - level.size - (off.size - 1);
  const ssr = rows.reduce(
    (a, r) => a + sq(r.value - (level.get(r.driver) ?? 0) - (off.get(r.compound) ?? 0)),
    0,
  );
  const s = dof > 0 ? Math.sqrt(ssr / dof) : null;
  return new Map(
    [...off].map(([c, v]) => [
      c,
      {
        value: v,
        sd:
          c === "MEDIUM"
            ? 0
            : s == null
              ? PRIOR_OFFSET_SD
              : s * Math.sqrt(1 / count(c) + 1 / count("MEDIUM")),
      },
    ]),
  );
}

/**
 * Precision-weighted blend of the fitted slope and the prior, floored at zero. Early in a race, track evolution
 * can make a thinly sampled compound look faster with age, which no tyre is.
 */
function shrink(fit: Normal, prior: Normal): Normal {
  const wf = 1 / sq(fit.sd || 1e-6);
  const wp = 1 / sq(prior.sd);
  return {
    value: Math.max(0, (fit.value * wf + prior.value * wp) / (wf + wp)),
    sd: Math.sqrt(1 / (wf + wp)),
  };
}

export function fitOf(model: DegradationModel, c: Compound): CompoundFit {
  return model.fits[c] ?? (model.fits.MEDIUM as CompoundFit);
}

export function lapTime(
  model: DegradationModel,
  pace: number,
  c: Compound,
  age: number,
  lap: number,
): number {
  const f = fitOf(model, c);
  return (
    pace +
    f.offset.value +
    f.slope.value * age +
    CLIFF_PER_LAP * Math.max(0, age - f.life) -
    FUEL_PER_LAP * (lap - 1)
  );
}

/**
 * Fresh-MEDIUM fuel-corrected pace from all the driver's clean laps. The current stint alone is too thin after a stop,
 * when two or three warm-up laps would set the pace for the rest of the race.
 */
export function paceOf(model: DegradationModel, laps: readonly CleanLap[]): number | null {
  if (laps.length === 0) return null;
  return mean(
    laps.map(
      (l) =>
        l.time -
        fitOf(model, l.compound).slope.value * l.age -
        fitOf(model, l.compound).offset.value,
    ),
  );
}
