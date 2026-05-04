import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { FastestLapSchema, LapSchema, PitStopSchema, TimingSchema } from "./timing";

describe("LapSchema", () => {
  it("should parse valid lap", () => {
    const valid = {
      driverId: "hamilton",
      lap: "1",
      position: "1",
      time: "1:45.123",
      timestamp: "2024-07-14T12:00:00Z",
    };
    const result = LapSchema.parse(valid);
    expect(result.driverId).toBe("hamilton");
    expect(result.lap).toBe("1");
    expect(result.position).toBe("1");
  });

  it("should reject invalid lap", () => {
    const invalid = {
      driverId: "",
      lap: "1",
    };
    expect(() => LapSchema.parse(invalid)).toThrow();
  });

  it("should infer correct types", () => {
    const parsed = LapSchema.parse({
      driverId: "hamilton",
      lap: "1",
      position: "1",
      time: "1:45.123",
    });
    type Lap = z.infer<typeof LapSchema>;
    const _typeCheck: Lap = parsed;
  });
});

describe("PitStopSchema", () => {
  it("should parse valid pit stop", () => {
    const valid = {
      driverId: "hamilton",
      lap: "20",
      stop: "1",
      time: "22.456",
      duration: "21.345",
    };
    const result = PitStopSchema.parse(valid);
    expect(result.driverId).toBe("hamilton");
    expect(result.stop).toBe("1");
  });

  it("should reject invalid pit stop", () => {
    const invalid = {
      driverId: "",
      lap: "20",
    };
    expect(() => PitStopSchema.parse(invalid)).toThrow();
  });
});

describe("TimingSchema", () => {
  it("should parse valid timing", () => {
    const valid = {
      driverId: "hamilton",
      position: "1",
      time: "1:45.123",
      gap: "+2.345",
      interval: "+1.234",
    };
    const result = TimingSchema.parse(valid);
    expect(result.driverId).toBe("hamilton");
    expect(result.gap).toBe("+2.345");
  });

  it("should handle missing optional fields", () => {
    const valid = {
      driverId: "hamilton",
      position: "1",
      time: "1:45.123",
    };
    const result = TimingSchema.parse(valid);
    expect(result.gap).toBeUndefined();
  });
});

describe("FastestLapSchema", () => {
  it("should parse valid fastest lap", () => {
    const valid = {
      driverId: "hamilton",
      lap: "45",
      time: "1:23.456",
      speed: "320.5",
      timestamp: "2024-07-14T14:30:00Z",
    };
    const result = FastestLapSchema.parse(valid);
    expect(result.driverId).toBe("hamilton");
    expect(result.lap).toBe("45");
    expect(result.speed).toBe("320.5");
  });

  it("should reject invalid fastest lap", () => {
    const invalid = {
      driverId: "",
      lap: "45",
    };
    expect(() => FastestLapSchema.parse(invalid)).toThrow();
  });
});
