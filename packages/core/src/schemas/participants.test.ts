import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { ConstructorSchema, DriverSchema, TeamSchema } from "./participants";

describe("DriverSchema", () => {
  it("should parse valid driver", () => {
    const valid = {
      driverId: "hamilton",
      permanentNumber: "44",
      code: "HAM",
      firstName: "Lewis",
      lastName: "Hamilton",
      nationality: "British",
      dateOfBirth: "1985-01-07",
      url: "http://en.wikipedia.org/wiki/Lewis_Hamilton",
    };
    const result = DriverSchema.parse(valid);
    expect(result.driverId).toBe("hamilton");
    expect(result.code).toBe("HAM");
    expect(result.permanentNumber).toBe("44");
  });

  it("should reject invalid driver", () => {
    const invalid = {
      driverId: "",
      firstName: "Lewis",
      lastName: "Hamilton",
    };
    expect(() => DriverSchema.parse(invalid)).toThrow();
  });

  it("should infer correct types", () => {
    const parsed = DriverSchema.parse({
      driverId: "hamilton",
      code: "HAM",
      firstName: "Lewis",
      lastName: "Hamilton",
      nationality: "British",
      dateOfBirth: "1985-01-07",
    });
    type Driver = z.infer<typeof DriverSchema>;
    const _typeCheck: Driver = parsed;
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
    const result = ConstructorSchema.parse(valid);
    expect(result.constructorId).toBe("mercedes");
    expect(result.name).toBe("Mercedes");
  });

  it("should parse valid constructor", () => {
    const valid = {
      constructorId: "mercedes",
      name: "Mercedes",
      nationality: "German",
      url: "http://en.wikipedia.org/wiki/Mercedes-Benz_in_Formula_One",
    };
    const result = ConstructorSchema.parse(valid);
    expect(result.constructorId).toBe("mercedes");
    expect(result.name).toBe("Mercedes");
  });

  it("should parse partial constructor", () => {
    const valid = {
      constructorId: "mercedes",
    };
    const result = ConstructorSchema.parse(valid);
    expect(result.constructorId).toBe("mercedes");
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
    const result = TeamSchema.parse(valid);
    expect(result.teamId).toBe("mercedes");
    expect(result.name).toBe("Mercedes");
  });
});
