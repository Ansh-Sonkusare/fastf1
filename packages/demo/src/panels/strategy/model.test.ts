import { describe, expect, it } from "vitest";
import { abuRace, monzaRace } from "./__fixtures__/races";
import { computeStrategy } from "./model";
import type { Race, Strategy } from "./types";

const run = (race: Race, lap: number, focus: number, safetyCar = false) =>
  computeStrategy(race, { lap, focus, pitLoss: 21.4, safetyCar }) as Strategy;

describe("computeStrategy", () => {
  it("reads no lap after the cursor", () => {
    const cut: Race = {
      ...abuRace,
      drivers: abuRace.drivers.map((d) => ({
        ...d,
        laps: d.laps.slice(0, 20),
      })),
      pitStops: abuRace.pitStops.filter((p) => p.lap <= 20),
    };
    const full = run(abuRace, 20, 1);
    expect(run(cut, 20, 1)).toEqual(full);
    expect(full.window.optimal.lap).toBe(28);
  });

  it("forbids staying out until a second dry compound is used", () => {
    const ver = run(abuRace, 20, 1);
    expect(ver.window.stayOut).toBeNull();
    expect(ver.plans.map((p) => p.name)).toEqual([
      "Pit L28 → HARD",
      "Undercut L21 → HARD",
      "Two-stop L21 → H, L39 → M",
    ]);
    const nor = run(abuRace, 20, 4);
    expect(nor.window.stayOut?.value).toBeCloseTo(8.3, 1);
    expect(nor.plans[0].name).toBe("Stay out · HARD to flag");
  });

  it("keeps a set within its tyre life, so Monza's unproven SOFT does not win a 33-lap stint", () => {
    const ver = run(monzaRace, 20, 1);
    expect(ver.model.fits.SOFT?.prior).toBe(true);
    expect(ver.model.fits.SOFT?.life).toBe(15);
    expect([ver.window.optimal.lap, ver.window.optimal.compound]).toEqual([29, "HARD"]);
    expect(ver.plans.find((p) => p.best)?.name).toBe("Pit L29 → HARD");
    expect(ver.alerts[ver.alerts.length - 1].title).toBe("MEDIUM losing ≈1.5s by age 31");
  });

  it("spreads pit loss by the median deviation of stops seen so far, ignoring later outliers", () => {
    const early = run(monzaRace, 20, 1).ghost.gapToLeader.sd;
    const late = run(monzaRace, 45, 1).ghost.gapToLeader.sd;
    expect(early).toBeCloseTo(1.19, 2);
    expect(late).toBeLessThan(2);
  });

  it("rejoins the ghost among the measured gaps, with half the pit loss under a safety car", () => {
    const green = run(monzaRace, 20, 1).ghost;
    expect(green.position.value).toBe(6);
    expect(green.gapToLeader.value).toBe(21.4);
    expect(green.ahead?.code).toBe("HAM");
    expect(green.ahead?.margin).toBeCloseTo(0.69, 2);
    expect(green.behind?.code).toBe("ANT");
    expect(green.behind?.margin).toBeCloseTo(8.119, 3);
    expect(green.clearAir).toBe(false);
    const sc = run(monzaRace, 20, 1, true).ghost;
    expect(sc.pitLoss).toBeCloseTo(11.13, 2);
    expect([sc.position.value, sc.ahead?.code, sc.behind?.code]).toEqual([2, "NOR", "PIA"]);
  });

  it("marks exactly one best plan and keeps every probability in [0, 1]", () => {
    const cases: [Race, number, number][] = [
      [abuRace, 20, 1],
      [abuRace, 20, 4],
      [abuRace, 45, 44],
      [monzaRace, 20, 1],
      [monzaRace, 30, 16],
    ];
    for (const [race, lap, focus] of cases) {
      const s = run(race, lap, focus);
      const best = s.plans.filter((p) => p.best);
      expect(best).toHaveLength(1);
      expect(best[0].delta.value).toBe(0);
      const probabilities = [
        s.ghost.probability,
        ...s.plans.map((p) => p.confidence),
        ...s.alerts.map((a) => a.probability),
      ];
      expect(probabilities.every((p) => p >= 0 && p <= 1)).toBe(true);
    }
  });

  it("warns of the undercut from the car behind in the reference's voice", () => {
    const [threat, degradation] = run(abuRace, 20, 1).alerts;
    expect(threat).toMatchObject({
      kind: "THREAT",
      title: "Undercut threat · PIA +2.0s",
      body: "PIA on HARD 20 laps. A stop this lap puts them ≈0.6s ahead after two laps on fresh tyres.",
    });
    expect(threat.probability).toBeCloseTo(0.9, 1);
    expect(degradation.title).toBe("MEDIUM losing ≈2.2s by age 31");
  });

  it("drops a duel that will not happen and keeps the likely one", () => {
    const alerts = run(abuRace, 20, 4).alerts;
    expect(alerts.map((a) => a.title)).toEqual([
      "Undercut on TSU · gap 2.8s",
      "HARD losing ≈0.7s by age 15",
    ]);
  });

  it("returns null once the focus car has retired", () => {
    expect(
      computeStrategy(monzaRace, {
        lap: 30,
        focus: 14,
        pitLoss: 22,
        safetyCar: false,
      }),
    ).toBeNull();
    expect(run(monzaRace, 20, 14).focus.code).toBe("ALO");
  });
});
