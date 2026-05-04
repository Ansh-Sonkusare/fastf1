import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { ConstructorStandingSchema, DriverStandingSchema } from "./participants";
import { QualifyingResultSchema, RaceResultSchema, SprintResultSchema } from "./results";

describe("QualifyingResultSchema", () => {
  it("should parse valid qualifying result", () => {
    const valid = {
      driverId: "hamilton",
      constructorId: "mercedes",
      position: "1",
      q1: "1:20.123",
      q2: "1:19.456",
      q3: "1:18.789",
    };
    const result = QualifyingResultSchema.parse(valid);
    expect(result.position).toBe("1");
    expect(result.q1).toBe("1:20.123");
  });

  it("should parse valid qualifying result", () => {
    const valid = {
      driverId: "hamilton",
      constructorId: "mercedes",
      position: "1",
      q1: "1:20.123",
      q2: "1:19.456",
      q3: "1:18.789",
    };
    const result = QualifyingResultSchema.parse(valid);
    expect(result.position).toBe("1");
    expect(result.q1).toBe("1:20.123");
  });

  it("should parse with nested Driver/Constructor", () => {
    const valid = {
      Driver: { driverId: "hamilton" },
      Constructor: { constructorId: "mercedes" },
      position: "1",
    };
    const result = QualifyingResultSchema.parse(valid);
    expect(result.Driver?.driverId).toBe("hamilton");
  });

  it("should infer correct types", () => {
    const parsed = QualifyingResultSchema.parse({
      driverId: "hamilton",
      constructorId: "mercedes",
      position: "1",
    });
    type QualifyingResult = z.infer<typeof QualifyingResultSchema>;
    const _typeCheck: QualifyingResult = parsed;
  });
});

describe("RaceResultSchema", () => {
  it("should parse valid race result", () => {
    const valid = {
      driverId: "hamilton",
      constructorId: "mercedes",
      position: "1",
      positionText: "1",
      points: "25",
      laps: "57",
      grid: "1",
      status: "Finished",
    };
    const result = RaceResultSchema.parse(valid);
    expect(result.position).toBe("1");
    expect(result.points).toBe("25");
  });

  it("should parse race result with nested Driver/Constructor", () => {
    const valid = {
      Driver: { driverId: "hamilton", code: "HAM" },
      Constructor: { constructorId: "mercedes", name: "Mercedes" },
      position: "1",
      points: "25",
    };
    const result = RaceResultSchema.parse(valid);
    expect(result.Driver?.driverId).toBe("hamilton");
    expect(result.Constructor?.name).toBe("Mercedes");
  });
});

describe("SprintResultSchema", () => {
  it("should parse valid sprint result", () => {
    const valid = {
      driverId: "hamilton",
      constructorId: "mercedes",
      position: "2",
      positionText: "2",
      points: "6",
      laps: "17",
      grid: "1",
      status: "Finished",
    };
    const result = SprintResultSchema.parse(valid);
    expect(result.position).toBe("2");
    expect(result.points).toBe("6");
  });

  it("should handle optional fields", () => {
    const valid = {
      driverId: "hamilton",
      constructorId: "mercedes",
      position: "1",
    };
    const result = SprintResultSchema.parse(valid);
    expect(result.status).toBeUndefined();
  });
});

describe("DriverStandingSchema", () => {
  it("should reuse from participants", () => {
    const valid = {
      position: "1",
      positionText: "1",
      points: "25",
      wins: "3",
      Driver: {
        driverId: "hamilton",
        code: "HAM",
        firstName: "Lewis",
        lastName: "Hamilton",
        nationality: "British",
        dateOfBirth: "1985-01-07",
      },
      Constructors: [
        {
          constructorId: "mercedes",
          name: "Mercedes",
          nationality: "German",
        },
      ],
    };
    const result = DriverStandingSchema.parse(valid);
    expect(result.position).toBe("1");
    expect(result.Driver.driverId).toBe("hamilton");
  });
});

describe("ConstructorStandingSchema", () => {
  it("should reuse from participants", () => {
    const valid = {
      position: "1",
      positionText: "1",
      points: "150",
      wins: "5",
      Constructor: {
        constructorId: "mercedes",
        name: "Mercedes",
        nationality: "German",
      },
    };
    const result = ConstructorStandingSchema.parse(valid);
    expect(result.position).toBe("1");
    expect(result.Constructor.name).toBe("Mercedes");
  });
});
