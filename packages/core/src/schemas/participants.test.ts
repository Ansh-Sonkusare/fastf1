import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { ConstructorSchema, DriverSchema, TeamSchema } from "./participants";

describe("DriverSchema", () => {
  it("should parse valid driver", () => {
    const valid = {
      driverId: "hamilton",
      permanentNumber: "44",
      code: "HAM",
      givenName: "Lewis",
      familyName: "Hamilton",
      nationality: "British",
      dateOfBirth: "1985-01-07",
      url: "http://en.wikipedia.org/wiki/Lewis_Hamilton",
    };
    const result = Schema.decodeUnknownEither(DriverSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.driverId).toBe("hamilton");
      expect(result.right.code).toBe("HAM");
      expect(result.right.permanentNumber).toBe("44");
    }
  });

  it("should reject invalid driver", () => {
    const invalid = {
      driverId: "",
      givenName: "Lewis",
      familyName: "Hamilton",
    };
    const result = Schema.decodeUnknownEither(DriverSchema)(invalid);
    expect(result._tag).toBe("Left");
  });

  it("should infer correct types", () => {
    const result = Schema.decodeUnknownEither(DriverSchema)({
      driverId: "hamilton",
      code: "HAM",
      givenName: "Lewis",
      familyName: "Hamilton",
      nationality: "British",
      dateOfBirth: "1985-01-07",
    });
    if (result._tag === "Right") {
      const _typeCheck: import("./participants").Driver = result.right;
    }
  });
});

describe("ConstructorSchema", () => {
  it("should parse valid constructor", () => {
    const valid = {
      constructorId: "mercedes",
      name: "Mercedes",
      nationality: "German",
      url: "http://en.wikipedia.org/wiki/Mercedes-Benz_in_Formula_One",
    };
    const result = Schema.decodeUnknownEither(ConstructorSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.constructorId).toBe("mercedes");
      expect(result.right.name).toBe("Mercedes");
    }
  });

  it("should parse partial constructor", () => {
    const valid = {
      constructorId: "mercedes",
    };
    const result = Schema.decodeUnknownEither(ConstructorSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.constructorId).toBe("mercedes");
    }
  });
});

describe("TeamSchema", () => {
  it("should parse valid team", () => {
    const valid = {
      teamId: "mercedes",
      name: "Mercedes",
      nationality: "German",
      url: "http://en.wikipedia.org/wiki/Mercedes-Benz_in_Formula_One",
    };
    const result = Schema.decodeUnknownEither(TeamSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.teamId).toBe("mercedes");
      expect(result.right.name).toBe("Mercedes");
    }
  });
});
