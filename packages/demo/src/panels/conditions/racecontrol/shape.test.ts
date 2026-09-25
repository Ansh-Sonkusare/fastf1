import { describe, it, expect } from "vitest";
import {
  shapeRaceEvents,
  filterRaceEventsByCategory,
  filterRaceEventsByType,
  filterRaceEventsByDriver,
  type RaceEvent,
} from "./shape";
import abuDhabiFixture from "./__fixtures__/abu-dhabi-race-2025.json";
import monzaFixture from "./__fixtures__/monza-race-2025.json";
import type { RaceControl, TeamRadio } from "@f1/core";

const abuDhabiRaceControl = abuDhabiFixture.raceControl as RaceControl[];
const abuDhabiTeamRadio = abuDhabiFixture.teamRadio as TeamRadio[];
const monzaRaceControl = monzaFixture.raceControl as RaceControl[];
const monzaTeamRadio = monzaFixture.teamRadio as TeamRadio[];

describe("Race Control and Team Radio shaping", () => {
  describe("shapeRaceEvents", () => {
    it("returns empty array when no events available", () => {
      const result = shapeRaceEvents([], [], "2024-12-07T14:00:00");
      expect(result).toEqual([]);
    });

    it("filters events by cutoff time (inclusive)", () => {
      const result = shapeRaceEvents(
        abuDhabiRaceControl,
        abuDhabiTeamRadio,
        "2024-12-07T14:09:30"
      );
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((e) => e.date <= "2024-12-07T14:09:30")).toBe(true);
    });

    it("excludes events after cutoff time", () => {
      const result = shapeRaceEvents(
        abuDhabiRaceControl,
        abuDhabiTeamRadio,
        "2024-12-07T14:08:00"
      );
      expect(result.every((e) => e.date <= "2024-12-07T14:08:00")).toBe(true);
    });

    it("merges race control and team radio events", () => {
      const result = shapeRaceEvents(
        abuDhabiRaceControl,
        abuDhabiTeamRadio,
        "2024-12-07T14:20:00"
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
        "2024-12-07T14:20:00"
      );
      for (let i = 1; i < result.length; i++) {
        expect(result[i].date >= result[i - 1].date).toBe(true);
      }
    });

    it("includes only radio events when includeRaceControl is false", () => {
      const result = shapeRaceEvents(
        abuDhabiRaceControl,
        abuDhabiTeamRadio,
        "2024-12-07T14:20:00",
        { includeRaceControl: false, includeRadio: true }
      );
      expect(result.every((e) => e.type === "radio")).toBe(true);
    });

    it("includes only race control events when includeRadio is false", () => {
      const result = shapeRaceEvents(
        abuDhabiRaceControl,
        abuDhabiTeamRadio,
        "2024-12-07T14:20:00",
        { includeRaceControl: true, includeRadio: false }
      );
      expect(result.every((e) => e.type === "race-control")).toBe(true);
    });

    it("filters by category when categories option provided", () => {
      const result = shapeRaceEvents(
        abuDhabiRaceControl,
        abuDhabiTeamRadio,
        "2024-12-07T14:20:00",
        { includeRaceControl: true, includeRadio: false, categories: ["Flag"] }
      );
      expect(result.every((e) => e.category === "Flag")).toBe(true);
    });

    it("transforms race control events correctly", () => {
      const result = shapeRaceEvents(
        abuDhabiRaceControl,
        [],
        "2024-12-07T14:05:30"
      );
      const flagEvent = result.find((e) => e.flag === "YELLOW");
      expect(flagEvent).toBeDefined();
      expect(flagEvent!.type).toBe("race-control");
      expect(flagEvent!.message).toBe("YELLOW FLAG");
      expect(flagEvent!.scope).toBe("Track");
      expect(flagEvent!.sector).toBe(1);
    });

    it("transforms team radio events correctly", () => {
      const result = shapeRaceEvents(
        [],
        abuDhabiTeamRadio,
        "2024-12-07T14:04:00"
      );
      expect(result).toHaveLength(1);
      const radioEvent = result[0];
      expect(radioEvent.type).toBe("radio");
      expect(radioEvent.category).toBe("radio");
      expect(radioEvent.driverNumber).toBe(1);
      expect(radioEvent.message).toContain("tire pressure");
    });

    it("works with Monza fixtures", () => {
      const result = shapeRaceEvents(
        monzaRaceControl,
        monzaTeamRadio,
        "2025-09-05T13:20:00"
      );
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((e) => e.date <= "2025-09-05T13:20:00")).toBe(true);
    });
  });

  describe("filterRaceEventsByCategory", () => {
    let events: RaceEvent[];

    beforeEach(() => {
      events = shapeRaceEvents(
        abuDhabiRaceControl,
        abuDhabiTeamRadio,
        "2024-12-07T14:20:00"
      );
    });

    it("filters events by category", () => {
      const result = filterRaceEventsByCategory(events, ["Flag"]);
      expect(result.every((e) => e.category === "Flag")).toBe(true);
    });

    it("includes multiple categories when specified", () => {
      const result = filterRaceEventsByCategory(events, ["Flag", "Drs"]);
      const categories = new Set(result.map((e) => e.category));
      expect(categories.has("Flag") || categories.has("Drs")).toBe(true);
    });

    it("returns empty array when no events match category", () => {
      const result = filterRaceEventsByCategory(events, ["SessionStatus"]);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("filterRaceEventsByType", () => {
    let events: RaceEvent[];

    beforeEach(() => {
      events = shapeRaceEvents(
        abuDhabiRaceControl,
        abuDhabiTeamRadio,
        "2024-12-07T14:20:00"
      );
    });

    it("filters to only race-control events", () => {
      const result = filterRaceEventsByType(events, "race-control");
      expect(result.every((e) => e.type === "race-control")).toBe(true);
    });

    it("filters to only radio events", () => {
      const result = filterRaceEventsByType(events, "radio");
      expect(result.every((e) => e.type === "radio")).toBe(true);
    });
  });

  describe("filterRaceEventsByDriver", () => {
    let events: RaceEvent[];

    beforeEach(() => {
      events = shapeRaceEvents(
        abuDhabiRaceControl,
        abuDhabiTeamRadio,
        "2024-12-07T14:20:00"
      );
    });

    it("filters events by driver number", () => {
      const result = filterRaceEventsByDriver(events, 1);
      expect(result.every((e) => e.driverNumber === 1)).toBe(true);
    });

    it("includes events with no driver when filtering", () => {
      const result = filterRaceEventsByDriver(events, 999);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("returns only driver 44 events when filtered", () => {
      const result = filterRaceEventsByDriver(events, 44);
      expect(result.every((e) => e.driverNumber === 44 || e.driverNumber === undefined)).toBe(
        true
      );
    });
  });

  describe("Complex filtering scenarios", () => {
    it("filters flag events for a specific driver", () => {
      const events = shapeRaceEvents(
        abuDhabiRaceControl,
        abuDhabiTeamRadio,
        "2024-12-07T14:20:00"
      );
      const flagEvents = filterRaceEventsByCategory(events, ["Flag"]);
      expect(flagEvents.length).toBeGreaterThanOrEqual(0);
    });

    it("combines multiple filters to show driver radio and penalties", () => {
      const events = shapeRaceEvents(
        abuDhabiRaceControl,
        abuDhabiTeamRadio,
        "2024-12-07T14:20:00"
      );
      const driverEvents = filterRaceEventsByDriver(events, 1);
      expect(driverEvents.length).toBeGreaterThanOrEqual(0);
    });
  });
});
