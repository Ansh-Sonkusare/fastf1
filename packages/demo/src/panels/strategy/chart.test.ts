import { describe, expect, it } from "vitest";
import abu from "./__fixtures__/abu-dhabi-2025.json";
import { bandPath, degradationChart, linePath, linear, ticks, windowChart } from "./chart";
import { computeStrategy } from "./model";
import { parseRace } from "./race";
import type { Strategy } from "./types";

const ver20 = computeStrategy(parseRace(abu), {
  lap: 20,
  focus: 1,
  pitLoss: 21.4,
  safetyCar: false,
}) as Strategy;

describe("chart primitives", () => {
  it("maps a domain onto a range", () => {
    expect(linear(20, 57, 40, 610)(38.5)).toBe(325);
  });

  it("draws a line and a closed band", () => {
    expect(linePath([0, 10, 20], [5, 6, 7])).toBe("M0.0,5.0L10.0,6.0L20.0,7.0");
    expect(bandPath([0, 10], [1, 2], [3, 4])).toBe("M0.0,1.0L10.0,2.0L10.0,4.0L0.0,3.0Z");
  });

  it("picks round ticks", () => {
    expect(ticks(20, 57, 6)).toEqual([20, 30, 40, 50]);
    expect(ticks(0, 16, 5)).toEqual([0, 5, 10, 15]);
  });
});

describe("windowChart", () => {
  it("puts NOW at the left edge and the optimum at zero cost", () => {
    const w = windowChart(ver20);
    expect(w.now).toBe(40);
    expect(w.optimal).toEqual({ x: w.x(28), y: 194 });
    expect(w.zones.map((z) => z.kind)).toContain("OPTIMAL");
    expect(w.stayOut).toBeNull();
  });
});

describe("degradationChart", () => {
  it("draws the three dry compounds and A's measured laps on the current set", () => {
    const d = degradationChart(ver20);
    expect(d.curves.map((c) => [c.compound, c.prior])).toEqual([
      ["SOFT", true],
      ["MEDIUM", false],
      ["HARD", false],
    ]);
    expect(d.dots.length).toBeGreaterThan(10);
    expect(d.dots.every((p) => p.compound === "MEDIUM" && p.current)).toBe(true);
    expect(d.now).toBe(d.x(20));
  });
});
