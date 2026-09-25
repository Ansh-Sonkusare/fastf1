import { describe, it, expect } from "vitest";
import { shapeWeather, getLatestWeather } from "./shape";
import abuDhabiFixture from "./__fixtures__/abu-dhabi-2025.json";
import monzaFixture from "./__fixtures__/monza-2025.json";
import type { Weather } from "@f1/core";

const abuDhabiWeather = abuDhabiFixture as Weather[];
const monzaWeather = monzaFixture as Weather[];

describe("Weather shaping", () => {
  describe("shapeWeather", () => {
    it("returns empty array when no data available", () => {
      const result = shapeWeather([], "2024-12-07T14:00:00");
      expect(result).toEqual([]);
    });

    it("filters weather by cutoff time (inclusive)", () => {
      const result = shapeWeather(
        abuDhabiWeather,
        "2024-12-07T14:15:00"
      );
      expect(result).toHaveLength(2);
      expect(result[0].date).toBe("2024-12-07T14:00:00");
      expect(result[1].date).toBe("2024-12-07T14:15:00");
    });

    it("excludes weather after cutoff time", () => {
      const result = shapeWeather(
        abuDhabiWeather,
        "2024-12-07T14:20:00"
      );
      expect(result).toHaveLength(2);
      expect(result.every((w) => w.date <= "2024-12-07T14:20:00")).toBe(true);
    });

    it("includes all weather before cutoff time", () => {
      const result = shapeWeather(
        abuDhabiWeather,
        "2024-12-07T15:00:00"
      );
      expect(result).toHaveLength(4);
    });

    it("transforms fields correctly from snake_case to camelCase", () => {
      const result = shapeWeather(
        abuDhabiWeather.slice(0, 1),
        "2024-12-07T14:00:00"
      );
      expect(result[0]).toEqual({
        date: "2024-12-07T14:00:00",
        airTemperature: 28.5,
        trackTemperature: 42.3,
        humidity: 45,
        pressure: 1015,
        windSpeed: 4.2,
        windDirection: 120,
        precipitation: 0,
        trackSurfaceTemperature: 43.8,
      });
    });

    it("maintains null values as undefined", () => {
      const weatherWithNulls: Weather[] = [
        {
          session_key: 9563,
          meeting_key: 1236,
          date: "2024-12-07T14:00:00",
          air_temperature: 28.5,
          track_temperature: 42.3,
          // other fields are undefined
        },
      ];
      const result = shapeWeather(weatherWithNulls, "2024-12-07T14:00:00");
      expect(result[0].humidity).toBeUndefined();
      expect(result[0].airTemperature).toBe(28.5);
    });

    it("sorts weather by date in ascending order", () => {
      const unsortedWeather: Weather[] = [
        ...abuDhabiWeather.slice(2),
        ...abuDhabiWeather.slice(0, 2),
      ];
      const result = shapeWeather(unsortedWeather, "2024-12-07T14:45:00");
      expect(result[0].date).toBe("2024-12-07T14:00:00");
      expect(result[result.length - 1].date).toBe("2024-12-07T14:45:00");
    });
  });

  describe("getLatestWeather", () => {
    it("returns undefined when no weather data available", () => {
      const result = getLatestWeather([], "2024-12-07T14:00:00");
      expect(result).toBeUndefined();
    });

    it("returns the most recent weather at cutoff time", () => {
      const result = getLatestWeather(
        abuDhabiWeather,
        "2024-12-07T14:30:00"
      );
      expect(result).toBeDefined();
      expect(result!.date).toBe("2024-12-07T14:30:00");
      expect(result!.trackTemperature).toBe(44.1);
    });

    it("returns the latest weather before cutoff time", () => {
      const result = getLatestWeather(
        abuDhabiWeather,
        "2024-12-07T14:25:00"
      );
      expect(result).toBeDefined();
      expect(result!.date).toBe("2024-12-07T14:15:00");
    });

    it("returns the only weather when only one entry available before cutoff", () => {
      const result = getLatestWeather(
        abuDhabiWeather,
        "2024-12-07T14:10:00"
      );
      expect(result).toBeDefined();
      expect(result!.date).toBe("2024-12-07T14:00:00");
    });

    it("works with Monza fixtures", () => {
      const result = getLatestWeather(
        monzaWeather,
        "2025-09-05T13:30:00"
      );
      expect(result).toBeDefined();
      expect(result!.date).toBe("2025-09-05T13:30:00");
      expect(result!.airTemperature).toBe(23.2);
    });
  });
});
