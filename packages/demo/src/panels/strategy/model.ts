import { cleanLaps, fitModel, fitOf, lapTime, longestStints, visible } from "./fit";
import {
  type Candidate,
  type Runner,
  SC_PIT_FACTOR,
  type SimContext,
  bestOf,
  bestPlanTime,
  oneStops,
  runnersAt,
  spreadBetween,
  stayOut,
  stopAt,
  twoStop,
} from "./plan";
import { phi, robustSd, sq } from "./stats";
import type {
  Compound,
  GhostRejoin,
  PitWindow,
  PlanOutcome,
  Race,
  Strategy,
  StrategyAlert,
  StrategyInputs,
} from "./types";

const MIN_PIT_SD = 0.3;
const ZONE_S = 2.5;
const CLEAR_AIR_S = 1.2;
const FIELD_S = 6;
const DEG_HORIZON = 11;
// Below this a duel is noise: the card would say "threat" about something that will not happen.
const MIN_ALERT_P = 0.1;

interface RivalFinish {
  readonly code: string;
  readonly finish: number;
  readonly sd: number;
}

function outcome(
  ctx: SimContext,
  name: string,
  cand: Candidate,
  a: Runner,
  rivals: readonly RivalFinish[],
  best: Candidate,
): PlanOutcome {
  const f = a.gap + cand.time.value;
  const combined = (r: RivalFinish) => Math.sqrt(sq(cand.time.sd) + sq(r.sd));
  const ahead = rivals.filter((r) => r.finish < f).sort((x, y) => y.finish - x.finish)[0];
  const behind = rivals.filter((r) => r.finish >= f).sort((x, y) => x.finish - y.finish)[0];
  const pAhead = rivals.map((r) => phi((f - r.finish) / combined(r)));
  return {
    name,
    stops: cand.stops,
    finish: {
      value: 1 + rivals.filter((r) => r.finish < f).length,
      sd: Math.sqrt(pAhead.reduce((s, p) => s + p * (1 - p), 0)),
    },
    delta: { value: cand.time.value - best.time.value, sd: spreadBetween(ctx, a, cand, best) },
    confidence:
      (ahead ? phi((f - ahead.finish) / combined(ahead)) : 1) *
      (behind ? phi((behind.finish - f) / combined(behind)) : 1),
    best: cand === best,
  };
}

function ghostRejoin(ctx: SimContext, a: Runner, rivals: readonly Runner[]): GhostRejoin {
  const pitLoss = ctx.pitLoss * (ctx.safetyCar ? SC_PIT_FACTOR : 1);
  const rg = a.gap + pitLoss;
  const sd = Math.sqrt(sq(ctx.pitSd) + sq(fitOf(ctx.model, a.compound).residual));
  const infront = rivals.filter((r) => r.gap < rg);
  const ahead = infront[infront.length - 1];
  const behind = rivals.find((r) => r.gap >= rg);
  const pAhead = rivals.map((r) => phi((rg - r.gap) / sd));
  return {
    pitLoss,
    position: {
      value: 1 + infront.length,
      sd: Math.sqrt(pAhead.reduce((s, p) => s + p * (1 - p), 0)),
    },
    gapToLeader: { value: rg, sd },
    ahead: ahead ? { code: ahead.code, margin: rg - ahead.gap } : null,
    behind: behind ? { code: behind.code, margin: behind.gap - rg } : null,
    clearAir: !ahead || rg - ahead.gap > CLEAR_AIR_S,
    probability:
      (behind ? phi((behind.gap - rg) / sd) : 1) - (ahead ? phi((ahead.gap - rg) / sd) : 0),
    field: rivals
      .filter((r) => Math.abs(r.gap - rg) <= FIELD_S)
      .map((r) => ({
        code: r.code,
        color: r.color,
        gapToLeader: r.gap,
        neighbour: r === ahead || r === behind,
      })),
  };
}

const swing = (margin: number, who: string) =>
  `${margin >= 0 ? "puts" : "leaves"} ${who} ≈${Math.abs(margin).toFixed(1)}s ${margin >= 0 ? "ahead" : "behind"}`;

function alertsFor(
  ctx: SimContext,
  a: Runner,
  ahead: Runner | undefined,
  behind: Runner | undefined,
): StrategyAlert[] {
  const lap = ctx.cursor + 1;
  const res = (c: Compound) => fitOf(ctx.model, c).residual;
  // The reference judges an undercut over the two laps after the first stop, the out-lap and the one after.
  const twoLaps = (r: Runner, c: Compound, age: number) =>
    lapTime(ctx.model, r.pace, c, age + 1, lap) + lapTime(ctx.model, r.pace, c, age + 2, lap + 1);
  const freshCompound = (r: Runner) => stopAt(ctx, r, lap)?.stops[0].compound ?? r.compound;
  const onOld = (r: Runner) => twoLaps(r, r.compound, r.age);
  const onFresh = (r: Runner, c: Compound) => twoLaps(r, c, 0);
  const sdOfTwo = (x: Compound, y: Compound) => Math.sqrt(2 * (sq(res(x)) + sq(res(y))));
  const out: StrategyAlert[] = [];
  if (behind) {
    const c = freshCompound(behind);
    const interval = behind.gap - a.gap;
    const margin = onOld(a) - onFresh(behind, c) - interval;
    out.push({
      kind: "THREAT",
      title: `Undercut threat · ${behind.code} +${interval.toFixed(1)}s`,
      body: `${behind.code} on ${behind.compound} ${behind.age} laps. A stop this lap ${swing(margin, "them")} after two laps on fresh tyres.`,
      probability: phi(margin / sdOfTwo(a.compound, c)),
    });
  }
  if (ahead) {
    const interval = a.gap - ahead.gap;
    const mine = freshCompound(a);
    const theirs = freshCompound(ahead);
    const under = onOld(ahead) - onFresh(a, mine) - interval;
    const over = onFresh(ahead, theirs) - onOld(a) - interval;
    const undercut = under >= over;
    const margin = Math.max(under, over);
    const gain = onOld(a) - onFresh(a, mine);
    out.push({
      kind: "OPPORTUNITY",
      title: `${undercut ? "Undercut" : "Overcut"} on ${ahead.code} · gap ${interval.toFixed(1)}s`,
      body: undercut
        ? `Fresh ${mine} worth ≈${(gain / 2).toFixed(1)}s/lap over the ${a.compound} ${a.age} laps. A stop this lap ${swing(margin, a.code)} after two laps.`
        : `${ahead.code} on ${ahead.compound} ${ahead.age} laps. Staying out while they stop ${swing(margin, a.code)} after two laps.`,
      probability: phi(margin / sdOfTwo(a.compound, undercut ? mine : theirs)),
    });
  }
  const f = fitOf(ctx.model, a.compound);
  out.push({
    kind: "DEGRADATION",
    title: `${a.compound} losing ≈${(lapTime(ctx.model, a.pace, a.compound, a.age + DEG_HORIZON, lap) - lapTime(ctx.model, a.pace, a.compound, a.age, lap)).toFixed(1)}s by age ${a.age + DEG_HORIZON}`,
    body: f.prior
      ? `No clean ${a.compound} laps yet, so this is the prior. The confidence band widens past the measured range.`
      : `Degradation model fitted to ${f.cleanLaps} clean laps. The confidence band widens past the measured range.`,
    probability: phi(f.slope.value / f.slope.sd),
  });
  return out.filter((a) => a.kind === "DEGRADATION" || a.probability >= MIN_ALERT_P);
}

/**
 * The strategy call for `inputs.focus` at the end of `inputs.lap`, reading only laps up to it.
 * The cursor clamps to 2..totalLaps-2 so a fit and a pit window exist. Returns null when the focus car had retired by the cursor.
 */
export function computeStrategy(race: Race, inputs: StrategyInputs): Strategy | null {
  const lap = Math.max(2, Math.min(inputs.lap, race.totalLaps - 2));
  const view = visible(race, lap);
  const clean = cleanLaps(view);
  const model = fitModel(clean, longestStints(view));
  const field = runnersAt(view, lap, model, clean);
  const index = field.findIndex((r) => r.number === inputs.focus);
  const a = field[index];
  if (!a || Number.isNaN(a.pace)) return null;
  const rivals = field.filter((r) => r !== a);
  const ctx: SimContext = {
    model,
    cursor: lap,
    totalLaps: race.totalLaps,
    pitLoss: inputs.pitLoss,
    pitSd: Math.max(MIN_PIT_SD, robustSd(view.pitStops.map((p) => p.laneDuration))),
    safetyCar: inputs.safetyCar,
  };

  const singles = oneStops(ctx, a);
  const stay = stayOut(ctx, a);
  const optimal = bestOf(singles) as Candidate;
  const floor = Math.min(...[...singles, ...(stay ? [stay] : [])].map((c) => c.time.value));
  const points = singles.map((c) => ({
    lap: c.stops[0].lap,
    compound: c.stops[0].compound,
    cost: { value: c.time.value - floor, sd: spreadBetween(ctx, a, c, optimal) },
  }));
  const at = singles.indexOf(optimal);
  let first = at;
  while (first > 0 && points[first - 1].cost.value <= ZONE_S) first--;
  let last = at;
  while (last < points.length - 1 && points[last + 1].cost.value <= ZONE_S) last++;
  const window: PitWindow = {
    points,
    optimal: points[at],
    stayOut: stay && { value: stay.time.value - floor, sd: spreadBetween(ctx, a, stay, optimal) },
    undercut: first < at ? [points[first].lap, points[at - 1].lap] : null,
    overcut: last > at ? [points[at + 1].lap, points[last].lap] : null,
  };

  const next = stopAt(ctx, a, lap + 1) as Candidate;
  const two = twoStop(ctx, a);
  const named: [string, Candidate][] = [];
  const add = (name: string, cand: Candidate | null) => {
    const key = JSON.stringify(cand?.stops);
    if (cand && !named.some(([, c]) => JSON.stringify(c.stops) === key)) named.push([name, cand]);
  };
  add(`Stay out · ${a.compound} to flag`, stay);
  add(`Pit L${optimal.stops[0].lap} → ${optimal.stops[0].compound}`, optimal);
  add(`Undercut L${lap + 1} → ${next.stops[0].compound}`, next);
  add(`Two-stop ${two?.stops.map((s) => `L${s.lap} → ${s.compound[0]}`).join(", ")}`, two);
  const best = bestOf(named.map(([, c]) => c)) as Candidate;
  const finishes = rivals.map((r) => {
    const t = bestPlanTime(ctx, r);
    return { code: r.code, finish: r.gap + t.value, sd: t.sd };
  });

  const own = clean.filter((l) => l.driver === a.number);
  return {
    lap,
    totalLaps: race.totalLaps,
    focus: {
      number: a.number,
      code: a.code,
      color: a.color,
      position: a.position,
      compound: a.compound,
      tyreAge: a.age,
      gapToLeader: a.gap,
    },
    model,
    ghost: ghostRejoin(ctx, a, rivals),
    window,
    plans: named.map(([name, cand]) => outcome(ctx, name, cand, a, finishes, best)),
    alerts: alertsFor(ctx, a, field[index - 1], field[index + 1]),
    measured: own.map((l) => ({
      tyreAge: l.age,
      time: l.time,
      compound: l.compound,
      currentStint: l.stint === a.stint,
    })),
    basePace: {
      value: a.pace,
      sd:
        fitOf(model, a.compound).residual /
        Math.sqrt(Math.max(1, own.filter((l) => l.compound === a.compound).length)),
    },
  };
}
