import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  SeasonSchema,
  RaceSchema,
  CircuitSchema,
  LocationSchema,
  SessionDateTimeSchema,
} from "./race";

describe("SeasonSchema", () => {
  it("should parse valid season", () => {
    const valid = { season: "2024", url: "http://example.com" };
    const result = SeasonSchema.parse(valid);
    expect(result.season).toBe("2024");
  });

  it("should reject invalid season", () => {
    const invalid = { season: "", url: "http://example.com" };
    expect(() => SeasonSchema.parse(invalid)).toThrow();
  });

  it("should infer correct types", () => {
    const parsed = SeasonSchema.parse({ season: "2024", url: "http://example.com" });
    type Season = z.infer<typeof SeasonSchema>;
    const _typeCheck: Season = parsed;
  });
});

describe("LocationSchema", () => {
  it("should parse valid location", () => {
    const valid = {
      lat: "40.1234",
      long: "-74.1234",
      locality: "New York",
      country: "USA",
    };
    const result = LocationSchema.parse(valid);
    expect(result.locality).toBe("New York");
  });

  it("should reject missing required fields", () => {
    const invalid = { lat: "40.1234", long: "-74.1234" };
    expect(() => LocationSchema.parse(invalid)).toThrow();
  });
});

describe("CircuitSchema", () => {
  it("should parse valid circuit with nested location", () => {
    const valid = {
      circuitId: "silverstone",
      url: "http://example.com",
      circuitName: "Silverstone Circuit",
      Location: {
        lat: "52.0786",
        long: "-1.0169",
        locality: "Silverstone",
        country: "UK",
      },
    };
    const result = CircuitSchema.parse(valid);
    expect(result.circuitName).toBe("Silverstone Circuit");
    expect(result.Location.country).toBe("UK");
  });
});

describe("SessionDateTimeSchema", () => {
  it("should parse session with date and time", () => {
    const valid = { date: "2024-07-14", time: "14:00:00Z" };
    const result = SessionDateTimeSchema.parse(valid);
    expect(result.date).toBe("2024-07-14");
  });

  it("should handle missing time", () => {
    const valid = { date: "2024-07-14" };
    const result = SessionDateTimeSchema.parse(valid);
    expect(result.date).toBe("2024-07-14");
  });
});

describe("RaceSchema", () => {
  it("should parse complete race with all nested objects", () => {
    const valid = {
      season: "2024",
      round: "12",
      url: "http://example.com",
      raceName: "British Grand Prix",
      Circuit: {
        circuitId: "silverstone",
        url: "http://example.com/circuit",
        circuitName: "Silverstone Circuit",
        Location: {
          lat: "52.0786",
          long: "-1.0169",
          locality: "Silverstone",
          country: "UK",
        },
      },
      date: "2024-07-14",
      time: "14:00:00Z",
      FirstPractice: { date: "2024-07-12", time: "12:00:00Z" },
      SecondPractice: { date: "2024-07-12", time: "16:00:00Z" },
      ThirdPractice: { date: "2024-07-13", time: "11:00:00Z" },
      Qualifying: { date: "2024-07-13", time: "15:00:00Z" },
      Sprint: { date: "2024-07-13", time: "18:00:00Z" },
    };
    const result = RaceSchema.parse(valid);
    expect(result.raceName).toBe("British Grand Prix");
    expect(result.Circuit.circuitName).toBe("Silverstone Circuit");
    expect(result.FirstPractice?.date).toBe("2024-07-12");
  });

  it("should reject race with missing required fields", () => {
    const invalid = {
      season: "2024",
      // missing round, raceName, Circuit
    };
    expect(() => RaceSchema.parse(invalid)).toThrow();
  });
});