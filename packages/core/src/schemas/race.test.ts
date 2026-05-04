import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  SeasonSchema,
  RaceSchema,
  CircuitSchema,
  LocationSchema,
  SessionDateTimeSchema,
  RaceTableSchema,
  MRDataSchema,
} from "./race";

const mockApiResponse = {
  MRData: {
    xmlns: "",
    series: "f1",
    url: "http://api.jolpi.ca/ergast/f1/2024/1/results/",
    limit: "30",
    offset: "0",
    total: "20",
    RaceTable: {
      season: "2024",
      round: "1",
      Races: [
        {
          season: "2024",
          round: "1",
          url: "https://en.wikipedia.org/wiki/2024_Bahrain_Grand_Prix",
          raceName: "Bahrain Grand Prix",
          Circuit: {
            circuitId: "bahrain",
            url: "http://en.wikipedia.org/wiki/Bahrain_International_Circuit",
            circuitName: "Bahrain International Circuit",
            Location: {
              lat: "26.0325",
              long: "50.5106",
              locality: "Sakhir",
              country: "Bahrain",
            },
          },
          date: "2024-03-02",
          time: "15:00:00Z",
        },
      ],
    },
  },
};

describe("Race schemas", () => {
  describe("LocationSchema", () => {
    it("should parse valid location", () => {
      const location = {
        lat: "26.0325",
        long: "50.5106",
        locality: "Sakhir",
        country: "Bahrain",
      };
      const result = LocationSchema.parse(location);
      expect(result.lat).toBe(26.0325);
      expect(result.long).toBe(50.5106);
      expect(result.locality).toBe("Sakhir");
      expect(result.country).toBe("Bahrain");
    });

    it("should reject invalid location", () => {
      const location = { lat: "not-a-number" };
      expect(() => LocationSchema.parse(location)).toThrow();
    });
  });

  describe("CircuitSchema", () => {
    it("should parse valid circuit with nested location", () => {
      const circuit = {
        circuitId: "bahrain",
        circuitName: "Bahrain International Circuit",
        url: "http://example.com",
        Location: {
          lat: "26.0325",
          long: "50.5106",
          locality: "Sakhir",
          country: "Bahrain",
        },
      };
      const result = CircuitSchema.parse(circuit);
      expect(result.circuitId).toBe("bahrain");
      expect(result.Location.country).toBe("Bahrain");
    });
  });

  describe("SessionDateTimeSchema", () => {
    it("should parse date and time from race", () => {
      const input = { date: "2024-03-02", time: "15:00:00Z" };
      const result = SessionDateTimeSchema.parse(input);
      expect(result.date).toEqual(new Date("2024-03-02"));
      expect(result.time).toBe("15:00:00Z");
    });

    it("should handle missing time", () => {
      const input = { date: "2024-03-02" };
      const result = SessionDateTimeSchema.parse(input);
      expect(result.date).toEqual(new Date("2024-03-02"));
      expect(result.time).toBeUndefined();
    });
  });

  describe("RaceSchema", () => {
    it("should parse full race object", () => {
      const race = mockApiResponse.MRData.RaceTable.Races[0];
      const result = RaceSchema.parse(race);
      expect(result.season).toBe("2024");
      expect(result.round).toBe("1");
      expect(result.raceName).toBe("Bahrain Grand Prix");
      expect(result.Circuit.circuitId).toBe("bahrain");
    });
  });

  describe("RaceTableSchema", () => {
    it("should parse full API response", () => {
      const result = MRDataSchema.parse(mockApiResponse.MRData);
      expect(result.RaceTable.season).toBe("2024");
      expect(result.RaceTable.Races).toHaveLength(1);
    });
  });

  describe("type inference", () => {
    it("should infer correct types", () => {
      const parsed = MRDataSchema.parse(mockApiResponse.MRData);
      type Race = z.infer<typeof RaceSchema>;
      const _race: Race = parsed.RaceTable.Races[0];
      expect(_race.season).toBeDefined();
    });
  });
});