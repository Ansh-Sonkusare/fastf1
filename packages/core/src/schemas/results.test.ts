import { Schema } from "effect";
import { describe, expect, it } from "vitest";
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
    const result = Schema.decodeUnknownEither(QualifyingResultSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.position).toBe("1");
      expect(result.right.q1).toBe("1:20.123");
    }
  });

  it("should parse with nested Driver/Constructor", () => {
    const valid = {
      Driver: { driverId: "hamilton" },
      Constructor: { constructorId: "mercedes" },
      position: "1",
    };
    const result = Schema.decodeUnknownEither(QualifyingResultSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.Driver?.driverId).toBe("hamilton");
    }
  });

  it("should infer correct types", () => {
    const result = Schema.decodeUnknownEither(QualifyingResultSchema)({
      driverId: "hamilton",
      constructorId: "mercedes",
      position: "1",
    });
    if (result._tag === "Right") {
      const _typeCheck: import("./results").QualifyingResult = result.right;
    }
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
    const result = Schema.decodeUnknownEither(RaceResultSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.position).toBe("1");
      expect(result.right.points).toBe("25");
    }
  });

  it("should parse race result with nested Driver/Constructor", () => {
    const valid = {
      Driver: { driverId: "hamilton", code: "HAM" },
      Constructor: { constructorId: "mercedes", name: "Mercedes" },
      position: "1",
      points: "25",
    };
    const result = Schema.decodeUnknownEither(RaceResultSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.Driver?.driverId).toBe("hamilton");
      expect(result.right.Constructor?.name).toBe("Mercedes");
    }
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
    const result = Schema.decodeUnknownEither(SprintResultSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.position).toBe("2");
      expect(result.right.points).toBe("6");
    }
  });

  it("should handle optional fields", () => {
    const valid = {
      driverId: "hamilton",
      constructorId: "mercedes",
      position: "1",
    };
    const result = Schema.decodeUnknownEither(SprintResultSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.status).toBeUndefined();
    }
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
        givenName: "Lewis",
        familyName: "Hamilton",
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
    const result = Schema.decodeUnknownEither(DriverStandingSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.position).toBe("1");
      expect(result.right.Driver.driverId).toBe("hamilton");
    }
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
    const result = Schema.decodeUnknownEither(ConstructorStandingSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.position).toBe("1");
      expect(result.right.Constructor.name).toBe("Mercedes");
    }
  });
});
