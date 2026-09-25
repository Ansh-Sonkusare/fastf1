import { describe, it, expect, beforeEach } from "vitest";
import {
  shapeRaceEvents,
  filterRaceEventsByCategory,
  filterRaceEventsByType,
  filterRaceEventsByDriver,
  type RaceEvent,
  type OpenF1RaceControlRow,
  type OpenF1TeamRadioRow,
} from "./shape";
import abuDhabiFixture from "./__fixtures__/abu-dhabi-race-2025.json";
import monzaFixture from "./__fixtures__/monza-race-2025.json";

// Fixtures are real rows pulled live from
// https://api.openf1.org/v1/race_control?session_key=9839 and
// https://api.openf1.org/v1/team_radio?session_key=9839 (2025 Abu Dhabi GP
// race), plus session_key=9912 (2025 Monza/Italian GP race), via
// packages/demo/src/panels/conditions/__fixtures__/fetch.mjs. Not
// hand-written. The API returns 109/73 race_control rows; fetch.mjs trims
// each down to 30 evenly-spaced real rows (always keeping the first and
// last). Team radio (22/32 rows) is kept in full. Real 2025 race control
// data for these sessions has no "YELLOW"/safety-car flag events — only
// GREEN, BLACK AND WHITE, BLUE WAVED and DOUBLE YELLOW — so tests below
// assert on what the races actually produced instead of an invented SC
// scenario.
const abuDhabiRaceControl = abuDhabiFixture.raceControl as OpenF1RaceControlRow[];
const abuDhabiTeamRadio = abuDhabiFixture.teamRadio as OpenF1TeamRadioRow[];
const monzaRaceControl = monzaFixture.raceControl as OpenF1RaceControlRow[];
const monzaTeamRadio = monzaFixture.teamRadio as OpenF1TeamRadioRow[];

describe("Race Control and Team Radio shaping", () => {
  describe("shapeRaceEvents", () => {
    it("returns empty array when no events available", () => {
      const result = shapeRaceEvents([], [], "2025-12-07T12:00:00+00:00");
      expect(result).toEqual([]);
    });

    it("has the trimmed/full row counts for both real sessions", () => {
      expect(abuDhabiRaceControl).toHaveLength(30);
      expect(abuDhabiTeamRadio).toHaveLength(22);
      expect(monzaRaceControl).toHaveLength(30);
      expect(monzaTeamRadio).toHaveLength(32);
    });

    it("filters events by cutoff time (inclusive)", () => {
      const result = shapeRaceEvents(
        abuDhabiRaceControl,
        abuDhabiTeamRadio,
        "2025-12-07T12:30:00+00:00"
      );
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((e) => e.date <= "2025-12-07T12:30:00+00:00")).toBe(
        true
      );
    });

    it("excludes events after cutoff time", () => {
      const result = shapeRaceEvents(
        abuDhabiRaceControl,
        abuDhabiTeamRadio,
        "2025-12-07T12:20:00+00:00"
      );
      expect(result).toHaveLength(1);
      expect(result[0].message).toBe("GREEN LIGHT - PIT EXIT OPEN");
    });

    it("merges race control and team radio events", () => {
      const result = shapeRaceEvents(
        abuDhabiRaceControl,
        abuDhabiTeamRadio,
        "2025-12-07T13:00:00+00:00"
      );
      const raceControlEvents = result.filter((e) => e.type === "race-control");
      const radioEvents = result.filter((e) => e.type === "radio");
      expect(raceControlEvents.length).toBeGreaterThan(0);
      expect(radioEvents.length).toBeGreaterThan(0);
    });

    it("sorts events by date", () => {
      const result = shapeRaceEvents(
        abuDhabiRaceControl,
        abuDhabiTeamRadio,
        "2025-12-07T13:00:00+00:00"
      );
      for (let i = 1; i < result.length; i++) {
        expect(result[i].date >= result[i - 1].date).toBe(true);
      }
    });

    it("includes only radio events when includeRaceControl is false", () => {
      const result = shapeRaceEvents(
        abuDhabiRaceControl,
        abuDhabiTeamRadio,
        "2025-12-07T13:00:00+00:00",
        { includeRaceControl: false, includeRadio: true }
      );
      expect(result.every((e) => e.type === "radio")).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("includes only race control events when includeRadio is false", () => {
      const result = shapeRaceEvents(
        abuDhabiRaceControl,
        abuDhabiTeamRadio,
        "2025-12-07T13:00:00+00:00",
        { includeRaceControl: true, includeRadio: false }
      );
      expect(result.every((e) => e.type === "race-control")).toBe(true);
    });

    it("filters by category when categories option provided", () => {
      const result = shapeRaceEvents(
        abuDhabiRaceControl,
        abuDhabiTeamRadio,
        "2025-12-07T15:00:00+00:00",
        { includeRaceControl: true, includeRadio: false, categories: ["Flag"] }
      );
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((e) => e.category === "Flag")).toBe(true);
    });

    it("transforms the real BLACK AND WHITE flag event correctly", () => {
      const result = shapeRaceEvents(
        abuDhabiRaceControl,
        [],
        "2025-12-07T13:48:58+00:00"
      );
      const flagEvent = result.find((e) => e.flag === "BLACK AND WHITE");
      expect(flagEvent).toBeDefined();
      expect(flagEvent!.type).toBe("race-control");
      expect(flagEvent!.date).toBe("2025-12-07T13:48:58+00:00");
      expect(flagEvent!.message).toBe(
        "BLACK AND WHITE FLAG FOR CAR 44 (HAM) - TRACK LIMITS"
      );
    });

    it("transforms real team radio events without inventing a transcript", () => {
      const result = shapeRaceEvents(
        [],
        abuDhabiTeamRadio,
        "2025-12-07T12:24:28.178000+00:00"
      );
      expect(result).toHaveLength(1);
      const radioEvent = result[0];
      expect(radioEvent.type).toBe("radio");
      expect(radioEvent.category).toBe("radio");
      expect(radioEvent.driverNumber).toBe(63);
      // Real OpenF1 team_radio rows carry no message text, only the clip URL.
      expect(radioEvent.message).toBeUndefined();
      expect(radioEvent.recordingUrl).toBe(
        "https://livetiming.formula1.com/static/2025/2025-12-07_Abu_Dhabi_Grand_Prix/2025-12-07_Race/TeamRadio/GEORUS01_63_20251207_162402.mp3"
      );
    });

    it("works with real Monza fixtures", () => {
      const result = shapeRaceEvents(
        monzaRaceControl,
        monzaTeamRadio,
        "2025-09-07T12:20:01+00:00"
      );
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((e) => e.date <= "2025-09-07T12:20:01+00:00")).toBe(
        true
      );
      const raceControlEvent = result.find((e) => e.type === "race-control");
      expect(raceControlEvent!.message).toBe("GREEN LIGHT - PIT EXIT OPEN");
    });
  });

  describe("filterRaceEventsByCategory", () => {
    let events: RaceEvent[];

    beforeEach(() => {
      events = shapeRaceEvents(
        abuDhabiRaceControl,
        abuDhabiTeamRadio,
        "2025-12-07T15:00:00+00:00"
      );
    });

    it("filters events by category", () => {
      const result = filterRaceEventsByCategory(events, ["Flag"]);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((e) => e.category === "Flag")).toBe(true);
    });

    it("includes multiple categories when specified", () => {
      const result = filterRaceEventsByCategory(events, ["Flag", "Drs"]);
      const categories = new Set(result.map((e) => e.category));
      expect(categories.has("Flag") || categories.has("Drs")).toBe(true);
    });

    it("returns empty array when no events match category", () => {
      // Real 2025 data has no CarEvent-category race control rows.
      const result = filterRaceEventsByCategory(events, ["CarEvent"]);
      expect(result).toHaveLength(0);
    });
  });

  describe("filterRaceEventsByType", () => {
    let events: RaceEvent[];

    beforeEach(() => {
      events = shapeRaceEvents(
        abuDhabiRaceControl,
        abuDhabiTeamRadio,
        "2025-12-07T15:00:00+00:00"
      );
    });

    it("filters to only race-control events", () => {
      const result = filterRaceEventsByType(events, "race-control");
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((e) => e.type === "race-control")).toBe(true);
    });

    it("filters to only radio events", () => {
      const result = filterRaceEventsByType(events, "radio");
      expect(result).toHaveLength(22);
      expect(result.every((e) => e.type === "radio")).toBe(true);
    });
  });

  describe("filterRaceEventsByDriver", () => {
    let events: RaceEvent[];

    beforeEach(() => {
      events = shapeRaceEvents(
        abuDhabiRaceControl,
        abuDhabiTeamRadio,
        "2025-12-07T15:00:00+00:00"
      );
    });

    it("filters events by driver number", () => {
      // Driver 1 (VER) has real radio clips in the Abu Dhabi fixture.
      const result = filterRaceEventsByDriver(events, 1);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((e) => e.driverNumber === 1)).toBe(true);
    });

    it("returns empty array for a driver number with no events", () => {
      const result = filterRaceEventsByDriver(events, 999);
      expect(result).toHaveLength(0);
    });
  });
});
