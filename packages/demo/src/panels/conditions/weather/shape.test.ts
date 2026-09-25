import { describe, it, expect } from "vitest";
import { shapeWeather, getLatestWeather, type OpenF1WeatherRow } from "./shape";
import abuDhabiFixture from "./__fixtures__/abu-dhabi-2025.json";
import monzaFixture from "./__fixtures__/monza-2025.json";

// Fixtures are real rows pulled live from
// https://api.openf1.org/v1/weather?session_key=9839 (2025 Abu Dhabi GP race)
// and session_key=9912 (2025 Monza/Italian GP race) via
// packages/demo/src/panels/conditions/__fixtures__/fetch.mjs — see
// .claude/autopilot/pitwall/OWNER-PROTOCOL.md and DATA.md for the session
// keys. Not hand-written.
const abuDhabiWeather = abuDhabiFixture as OpenF1WeatherRow[];
const monzaWeather = monzaFixture as OpenF1WeatherRow[];

describe("Weather shaping", () => {
  describe("shapeWeather", () => {
    it("returns empty array when no data available", () => {
      const result = shapeWeather([], "2025-12-07T12:06:07.170000+00:00");
      expect(result).toEqual([]);
    });

    it("has the documented row counts for both real sessions", () => {
      // DATA.md: Abu Dhabi 154 weather records, Monza 144.
      expect(abuDhabiWeather).toHaveLength(154);
      expect(monzaWeather).toHaveLength(144);
    });

    it("filters weather by cutoff time (inclusive)", () => {
      const result = shapeWeather(
        abuDhabiWeather,
        "2025-12-07T12:07:07.186000+00:00"
      );
      expect(result).toHaveLength(2);
      expect(result[0].date).toBe("2025-12-07T12:06:07.170000+00:00");
      expect(result[1].date).toBe("2025-12-07T12:07:07.186000+00:00");
    });

    it("excludes weather after cutoff time", () => {
      const result = shapeWeather(
        abuDhabiWeather,
        "2025-12-07T12:08:07.193000+00:00"
      );
      expect(result).toHaveLength(3);
      expect(
        result.every((w) => w.date <= "2025-12-07T12:08:07.193000+00:00")
      ).toBe(true);
    });

    it("transforms the first real Abu Dhabi row's fields correctly from snake_case to camelCase", () => {
      const result = shapeWeather(
        abuDhabiWeather.slice(0, 1),
        "2025-12-07T12:06:07.170000+00:00"
      );
      expect(result[0]).toEqual({
        date: "2025-12-07T12:06:07.170000+00:00",
        airTemperature: 27.4,
        trackTemperature: 34.6,
        humidity: 55,
        pressure: 1016.4,
        windSpeed: 3,
        windDirection: 67,
        rainfall: 0,
      });
    });

    it("transforms the first real Monza row's fields correctly", () => {
      const result = shapeWeather(
        monzaWeather.slice(0, 1),
        "2025-09-07T12:06:03.272000+00:00"
      );
      expect(result[0]).toEqual({
        date: "2025-09-07T12:06:03.272000+00:00",
        airTemperature: 26,
        trackTemperature: 43.5,
        humidity: 44,
        pressure: 997.5,
        windSpeed: 2.5,
        windDirection: 263,
        rainfall: 0,
      });
    });

    it("maps null fields to undefined", () => {
      const weatherWithNulls: OpenF1WeatherRow[] = [
        {
          session_key: 9839,
          meeting_key: 1276,
          date: "2025-12-07T12:06:07.170000+00:00",
          air_temperature: 27.4,
          track_temperature: null,
          humidity: null,
          pressure: null,
          wind_speed: null,
          wind_direction: null,
          rainfall: null,
        },
      ];
      const result = shapeWeather(
        weatherWithNulls,
        "2025-12-07T12:06:07.170000+00:00"
      );
      expect(result[0].humidity).toBeUndefined();
      expect(result[0].rainfall).toBeUndefined();
      expect(result[0].airTemperature).toBe(27.4);
    });

    it("sorts weather by date in ascending order", () => {
      const unsortedWeather = [
        abuDhabiWeather[2],
        abuDhabiWeather[0],
        abuDhabiWeather[1],
      ];
      const result = shapeWeather(
        unsortedWeather,
        "2025-12-07T14:39:07.948000+00:00"
      );
      expect(result[0].date).toBe("2025-12-07T12:06:07.170000+00:00");
      expect(result[result.length - 1].date).toBe(
        "2025-12-07T12:08:07.193000+00:00"
      );
    });
  });

  describe("getLatestWeather", () => {
    it("returns undefined when no weather data available", () => {
      const result = getLatestWeather([], "2025-12-07T12:06:07.170000+00:00");
      expect(result).toBeUndefined();
    });

    it("returns the last real reading of the Abu Dhabi race", () => {
      const result = getLatestWeather(
        abuDhabiWeather,
        "2025-12-07T14:39:07.948000+00:00"
      );
      expect(result).toBeDefined();
      expect(result!.date).toBe("2025-12-07T14:39:07.948000+00:00");
      expect(result!.airTemperature).toBe(25.9);
      expect(result!.trackTemperature).toBe(28.9);
    });

    it("returns the latest weather strictly before a mid-race cutoff", () => {
      const result = getLatestWeather(
        abuDhabiWeather,
        "2025-12-07T12:07:30.000000+00:00"
      );
      expect(result).toBeDefined();
      expect(result!.date).toBe("2025-12-07T12:07:07.186000+00:00");
    });

    it("works with real Monza fixtures", () => {
      const result = getLatestWeather(
        monzaWeather,
        "2025-09-07T12:06:03.272000+00:00"
      );
      expect(result).toBeDefined();
      expect(result!.date).toBe("2025-09-07T12:06:03.272000+00:00");
      expect(result!.airTemperature).toBe(26);
    });
  });
});
