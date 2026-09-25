import { describe, expect, it } from "vitest";
import { approx, approxPos } from "./format";

describe("approx", () => {
  it("prints a prediction as ≈ value ± one sd in the same unit", () => {
    expect(approx({ value: 21.44, sd: 0.53 }, 1, "s")).toBe("≈21.4s ±0.5s");
  });

  it("signs a delta when asked", () => {
    expect(approx({ value: 3.62, sd: 3.3 }, 1, "s", true)).toBe("≈+3.6s ±3.3s");
    expect(approx({ value: 0, sd: 0 }, 1, "s", true)).toBe("≈+0.0s ±0.0s");
  });

  it("prints a finishing position with its spread in places", () => {
    expect(approxPos({ value: 3, sd: 0.44 })).toBe("≈P3 ±0.4");
  });
});
