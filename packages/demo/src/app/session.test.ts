import type { OpenF1Driver, Race, Session, SessionResult } from "@f1/core";
import { describe, expect, it } from "vitest";
import { classificationOrder, pickSession, sessionTitle, toConsoleSessions, toDriverMap } from "./session";
import type { ConsoleSession } from "./types";
import australia from "../panels/tower/__fixtures__/australia.json";

const session = (session_key: number, date_start: string, extra: Partial<Session> = {}): Session => ({
  session_key,
  meeting_key: session_key - 1000,
  session_name: "Race",
  session_type: "Race",
  year: 2025,
  country_key: 1,
  country_name: "United Arab Emirates",
  circuit_key: 70,
  circuit_short_name: "Yas Marina Circuit",
  location: "Yas Island",
  date_start,
  date_end: date_start.replace("T13", "T15"),
  gmt_offset: "04:00:00",
  ...extra,
});

describe("toConsoleSessions", () => {
  const schedule = [{ round: "24", date: "2025-12-07", raceName: "Abu Dhabi Grand Prix" }] as Race[];
  const now = Date.parse("2025-12-10T00:00:00Z");

  it("keeps completed races in date order, named from the schedule by date", () => {
    const out = toConsoleSessions(
      [
        session(9839, "2025-12-07T13:00:00+00:00"),
        session(9912, "2025-09-07T13:00:00+00:00", { country_name: "Italy" }),
        session(9999, "2025-12-14T13:00:00+00:00"),
        session(9000, "2025-06-01T13:00:00+00:00", { is_cancelled: true }),
      ],
      schedule,
      now,
    );
    expect(out.map((s) => [s.sessionKey, s.round, s.name])).toEqual([
      [9912, null, "Italy Grand Prix"],
      [9839, 24, "Abu Dhabi Grand Prix"],
    ]);
    expect(sessionTitle(out[1]!)).toBe("Round 24 · Abu Dhabi Grand Prix · Race");
  });
});

describe("toDriverMap", () => {
  it("maps driver_number to code, name and #team colour", () => {
    const m = toDriverMap([
      { driver_number: 1, name_acronym: "VER", first_name: "Max", last_name: "Verstappen", team_name: "Red Bull Racing", team_colour: "4781D7" } as OpenF1Driver,
    ]);
    expect(m.get(1)).toEqual({ number: 1, code: "VER", name: "Max Verstappen", team: "Red Bull Racing", color: "#4781d7" });
  });
});

describe("classificationOrder", () => {
  it("orders by position with null-position DNFs last: Australia 9693", () => {
    const order = classificationOrder(australia.result as unknown as SessionResult[]);
    expect(order.slice(0, 3)).toEqual([4, 1, 63]);
    expect(order.slice(14).sort((a, b) => a - b)).toEqual([5, 6, 7, 14, 30, 55]);
  });
});

describe("pickSession", () => {
  const s = (sessionKey: number, round: number) => ({ sessionKey, round }) as ConsoleSession;
  const sessions = [s(9693, 1), s(9858, 22), s(9839, 24)];

  it("an explicit session wins", () => {
    expect(pickSession(sessions, 9858, 1)?.sessionKey).toBe(9858);
  });

  it("keeps the round picked while OpenF1 was locked once sessions arrive", () => {
    expect(pickSession(sessions, null, 1)?.sessionKey).toBe(9693);
  });

  it("falls back to the latest race", () => {
    expect(pickSession(sessions, null, null)?.sessionKey).toBe(9839);
    expect(pickSession(sessions, null, 7)?.sessionKey).toBe(9839);
  });
});
