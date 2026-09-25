import { Stint } from "@f1/core";

/**
 * Fixture: Abu Dhabi 2025 Race, stint (tyre strategy) data
 */
export const abuDhabiStints: Stint[] = [
  // Max Verstappen - driver 1
  {
    session_key: 9999,
    meeting_key: 1234,
    driver_number: 1,
    stint_number: 1,
    lap_start: 1,
    lap_end: 6,
    compound: "SOFT",
    tyre_age_at_start: 0,
  },
  {
    session_key: 9999,
    meeting_key: 1234,
    driver_number: 1,
    stint_number: 2,
    lap_start: 7,
    lap_end: 27,
    compound: "MEDIUM",
    tyre_age_at_start: 0,
  },
  {
    session_key: 9999,
    meeting_key: 1234,
    driver_number: 1,
    stint_number: 3,
    lap_start: 28,
    lap_end: 55,
    compound: "HARD",
    tyre_age_at_start: 0,
  },

  // Lewis Hamilton - driver 44
  {
    session_key: 9999,
    meeting_key: 1234,
    driver_number: 44,
    stint_number: 1,
    lap_start: 1,
    lap_end: 7,
    compound: "SOFT",
    tyre_age_at_start: 0,
  },
  {
    session_key: 9999,
    meeting_key: 1234,
    driver_number: 44,
    stint_number: 2,
    lap_start: 8,
    lap_end: 25,
    compound: "MEDIUM",
    tyre_age_at_start: 0,
  },
  {
    session_key: 9999,
    meeting_key: 1234,
    driver_number: 44,
    stint_number: 3,
    lap_start: 26,
    lap_end: 55,
    compound: "HARD",
    tyre_age_at_start: 0,
  },
];
