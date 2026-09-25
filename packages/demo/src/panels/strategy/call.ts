import { approx, approxPos } from "./format";
import { tyreOf } from "../../ui/tokens";
import type { Strategy } from "./types";

export type FactTone = "normal" | "warn" | "predicted" | "muted";

export interface HeroFact {
  readonly label: string;
  readonly value: string;
  readonly tone: FactTone;
}

/** The strategy call rendered as the panel's hero: a headline, a one-line rationale, a badge, and the stats row beneath it. */
export interface HeroCall {
  readonly head: string;
  readonly sub: string;
  readonly tag: string;
  readonly isBest: boolean;
  readonly facts: readonly HeroFact[];
}

const pct = (p: number) => `${Math.round(p * 100)}%`;

/**
 * Builds the hero call for the plan at `selected`. Mirrors the reference's `call` derivation
 * (docs/design/undercut-terminal.dc.html): the headline reads off the plan's first stop, the
 * sub-line reads off the ghost rejoin when that stop is imminent and off the plan's own finish
 * otherwise, and the last fact compares the selected plan's delta against the next-best rival plan.
 */
export function buildHeroCall(s: Strategy, selected: number, safetyCar: boolean): HeroCall {
  const plan = s.plans[selected];
  const s0 = plan.stops[0];
  const pitSoon = !!s0 && s0.lap <= s.lap + 1;
  const compound = tyreOf(s.focus.compound).code;

  const head = !s0
    ? `Stay out on ${compound} to the flag`
    : pitSoon
      ? `${s0.lap === s.lap ? "Pit now" : "Pit next lap"} → ${tyreOf(s0.compound).code}`
      : `Stay out · pit L${s0.lap} → ${tyreOf(s0.compound).code}`;

  const airTxt = s.ghost.clearAir ? "clear air" : `traffic behind ${s.ghost.ahead?.code ?? ""}`;
  const sub = pitSoon
    ? `Rejoin ≈P${Math.round(s.ghost.position.value)}, ${airTxt} (${pct(s.ghost.probability)})`
    : `Finish ≈P${Math.round(plan.finish.value)} (${pct(plan.confidence)})`;

  const tag = plan.best ? "RECOMMENDED" : `APPLIED · ${approx(plan.delta, 1, "s", true)} VS BEST`;

  const ahead = s.ghost.ahead;
  const behind = s.ghost.behind;
  const rejoinValue = `${pitSoon ? "" : `≈P${Math.round(s.ghost.position.value)} · `}${
    ahead ? `${ahead.code} by ≈${ahead.margin.toFixed(1)}s` : "clear track"
  }`;

  const rivalDeltas = s.plans.filter((_, i) => i !== selected).map((p) => p.delta.value);
  const nextDelta = rivalDeltas.length > 0 ? Math.min(...rivalDeltas) - plan.delta.value : 0;

  const facts: HeroFact[] = [
    {
      label: "Pit loss",
      value: `${s.ghost.pitLoss.toFixed(1)}s${safetyCar ? " under SC" : ""}`,
      tone: "normal",
    },
    {
      label: pitSoon ? "Rejoins behind" : "Pit now rejoins",
      value: rejoinValue,
      tone: s.ghost.clearAir ? "normal" : "warn",
    },
    {
      label: "Ahead of",
      value: behind ? `${behind.code} by ≈${behind.margin.toFixed(1)}s` : "—",
      tone: "normal",
    },
    { label: "Finish", value: approxPos(plan.finish), tone: "predicted" },
    {
      label: plan.best ? "Next best plan" : "Best plan",
      value:
        nextDelta >= 0 ? `+${nextDelta.toFixed(1)}s slower` : `${(-nextDelta).toFixed(1)}s faster`,
      tone: "muted",
    },
  ];

  return { head, sub, tag, isBest: plan.best, facts };
}
