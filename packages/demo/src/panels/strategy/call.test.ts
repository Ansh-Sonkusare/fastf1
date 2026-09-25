import { describe, expect, it } from "vitest";
import { abuRace, monzaRace } from "./__fixtures__/races";
import { buildHeroCall } from "./call";
import { computeStrategy } from "./model";
import type { Race, Strategy } from "./types";

const run = (race: Race, lap: number, focus: number, safetyCar = false) =>
  computeStrategy(race, { lap, focus, pitLoss: 21.4, safetyCar }) as Strategy;

describe("buildHeroCall", () => {
  it("reads a stay-out headline and the plan's own finish when the stop is well ahead", () => {
    const s = run(abuRace, 20, 1);
    const call = buildHeroCall(s, 0, false);
    expect(call.head).toBe("Stay out · pit L28 → H");
    expect(call.sub).toBe("Finish ≈P1 (58%)");
    expect(call.tag).toBe("RECOMMENDED");
    expect(call.isBest).toBe(true);
    expect(call.facts).toEqual([
      { label: "Pit loss", value: "21.4s", tone: "normal" },
      { label: "Pit now rejoins", value: "≈P2 · PIA by ≈19.4s", tone: "normal" },
      { label: "Ahead of", value: "TSU by ≈4.0s", tone: "normal" },
      { label: "Finish", value: "≈P1 ±0.5", tone: "predicted" },
      { label: "Next best plan", value: "+3.0s slower", tone: "muted" },
    ]);
  });

  it("switches to pit-now phrasing and the ghost rejoin sub once the stop lands this lap", () => {
    // Same plan, cursor advanced to the stop's own lap.
    const s = run(abuRace, 20, 1);
    const call = buildHeroCall({ ...s, lap: 28 }, 0, false);
    expect(call.head).toBe("Pit now → H");
    expect(call.sub).toBe("Rejoin ≈P2, clear air (100%)");
  });

  it("reads next-lap phrasing, traffic on exit, and an APPLIED tag for a non-best imminent stop", () => {
    const s = run(monzaRace, 20, 1);
    const i = s.plans.findIndex((p) => p.name.startsWith("Undercut"));
    const call = buildHeroCall(s, i, false);
    expect(call.head).toBe("Pit next lap → H");
    expect(call.sub).toBe("Rejoin ≈P6, traffic behind HAM (72%)");
    expect(call.tag).toBe("APPLIED · ≈+5.2s ±4.4s VS BEST");
    expect(call.isBest).toBe(false);
    expect(call.facts[1]).toEqual({ label: "Rejoins behind", value: "HAM by ≈0.7s", tone: "warn" });
    expect(call.facts[4]).toEqual({ label: "Best plan", value: "5.2s faster", tone: "muted" });
  });

  it("suffixes the pit-loss fact under the safety-car what-if", () => {
    const s = run(monzaRace, 20, 1, true);
    const call = buildHeroCall(s, s.plans.findIndex((p) => p.best), true);
    expect(call.facts[0]).toEqual({ label: "Pit loss", value: "11.1s under SC", tone: "normal" });
  });
});
