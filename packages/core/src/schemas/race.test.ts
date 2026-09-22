import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  CircuitSchema,
  LocationSchema,
  RaceSchema,
  SeasonSchema,
  SessionDateTimeSchema,
} from "./race";

describe("SeasonSchema", () => {
  it("should parse valid season", () => {
    const valid = { season: "2024", url: "http://example.com" };
    const result = Schema.decodeUnknownEither(SeasonSchema)(valid);
    expect(result._tag === "Right" ? result.right.season : null).toBe("2024");
  });

  it("should reject invalid season", () => {
    const invalid = { season: "", url: "http://example.com" };
    const result = Schema.decodeUnknownEither(SeasonSchema)(invalid);
    expect(result._tag).toBe("Left");
  });

  it("should infer correct types", () => {
    const result = Schema.decodeUnknownEither(SeasonSchema)({
      season: "2024",
      url: "http://example.com",
    });
    if (result._tag === "Right") {
      const _typeCheck: import("./race").Season = result.right;
    }
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
    const result = Schema.decodeUnknownEither(LocationSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.locality).toBe("New York");
    }
  });

  it("should reject missing required fields", () => {
    const invalid = { lat: "40.1234", long: "-74.1234" };
    const result = Schema.decodeUnknownEither(LocationSchema)(invalid);
    expect(result._tag).toBe("Left");
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
    const result = Schema.decodeUnknownEither(CircuitSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.circuitName).toBe("Silverstone Circuit");
      expect(result.right.Location.country).toBe("UK");
    }
  });
});

describe("SessionDateTimeSchema", () => {
  it("should parse session with date and time", () => {
    const valid = { date: "2024-07-14", time: "14:00:00Z" };
    const result = Schema.decodeUnknownEither(SessionDateTimeSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.date).toBe("2024-07-14");
    }
  });

  it("should handle missing time", () => {
    const valid = { date: "2024-07-14" };
    const result = Schema.decodeUnknownEither(SessionDateTimeSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.date).toBe("2024-07-14");
    }
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
    const result = Schema.decodeUnknownEither(RaceSchema)(valid);
    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.raceName).toBe("British Grand Prix");
      expect(result.right.Circuit.circuitName).toBe("Silverstone Circuit");
      expect(result.right.FirstPractice?.date).toBe("2024-07-12");
    }
  });

  it("should reject race with missing required fields", () => {
    const invalid = {
      season: "2024",
    };
    const result = Schema.decodeUnknownEither(RaceSchema)(invalid);
    expect(result._tag).toBe("Left");
  });
});
