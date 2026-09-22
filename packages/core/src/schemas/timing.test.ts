import { Schema } from "effect";
import { describe, expect, it } from "vitest";
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
    const result = Schema.decodeUnknownEither(LapSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.driverId).toBe("hamilton");
      expect(result.right.lap).toBe("1");
      expect(result.right.position).toBe("1");
    }
  });

  it("should reject invalid lap", () => {
    const invalid = {
      driverId: "",
      lap: "1",
    };
    const result = Schema.decodeUnknownEither(LapSchema)(invalid);
    expect(result._tag).toBe("Left");
  });

  it("should infer correct types", () => {
    const result = Schema.decodeUnknownEither(LapSchema)({
      driverId: "hamilton",
      lap: "1",
      position: "1",
      time: "1:45.123",
    });
    if (result._tag === "Right") {
      const _typeCheck: import("./timing").Lap = result.right;
    }
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
    const result = Schema.decodeUnknownEither(PitStopSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.driverId).toBe("hamilton");
      expect(result.right.stop).toBe("1");
    }
  });

  it("should reject invalid pit stop", () => {
    const invalid = {
      driverId: "",
      lap: "20",
    };
    const result = Schema.decodeUnknownEither(PitStopSchema)(invalid);
    expect(result._tag).toBe("Left");
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
    const result = Schema.decodeUnknownEither(TimingSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.driverId).toBe("hamilton");
      expect(result.right.gap).toBe("+2.345");
    }
  });

  it("should handle missing optional fields", () => {
    const valid = {
      driverId: "hamilton",
      position: "1",
      time: "1:45.123",
    };
    const result = Schema.decodeUnknownEither(TimingSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.gap).toBeUndefined();
    }
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
    const result = Schema.decodeUnknownEither(FastestLapSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.driverId).toBe("hamilton");
      expect(result.right.lap).toBe("45");
      expect(result.right.speed).toBe("320.5");
    }
  });

  it("should reject invalid fastest lap", () => {
    const invalid = {
      driverId: "",
      lap: "45",
    };
    const result = Schema.decodeUnknownEither(FastestLapSchema)(invalid);
    expect(result._tag).toBe("Left");
  });
});
