import type { OpenF1Driver, Race, Session, SessionResult } from "@f1/core";
import { asSessionKey } from "../data/openf1";
import type { ConsoleSession, DriverInfo, DriverNumber } from "./types";

/** Completed, non-cancelled OpenF1 race sessions, named and numbered from the Jolpica schedule by date. */
export function toConsoleSessions(
  sessions: readonly Session[],
  schedule: readonly Race[],
  now: number,
): ConsoleSession[] {
  const byDate = new Map(schedule.map((r) => [r.date, r]));
  return sessions
    .filter((s) => !s.is_cancelled && Date.parse(s.date_end) < now)
    .sort((x, y) => Date.parse(x.date_start) - Date.parse(y.date_start))
    .map((s) => {
      const race = byDate.get(s.date_start.slice(0, 10));
      return {
        sessionKey: asSessionKey(s.session_key),
        meetingKey: s.meeting_key,
        year: s.year,
        round: race ? Number(race.round) : null,
        name: race?.raceName ?? `${s.country_name} Grand Prix`,
        circuit: s.circuit_short_name,
        dateStart: s.date_start,
        dateEnd: s.date_end,
      };
    });
}

/** "Round 24 · Abu Dhabi Grand Prix · Race" */
export const sessionTitle = (s: ConsoleSession) =>
  `${s.round === null ? "" : `Round ${s.round} · `}${s.name} · Race`;

export function toDriverMap(rows: readonly OpenF1Driver[]): Map<DriverNumber, DriverInfo> {
  return new Map(
    rows.map((d) => [
      d.driver_number,
      {
        number: d.driver_number,
        code: d.name_acronym,
        name: `${d.first_name} ${d.last_name}`,
        team: d.team_name,
        color: `#${(d.team_colour || "8b939e").toLowerCase()}`,
      },
    ]),
  );
}

/** Finishing order from session_result. OpenF1 sends `position: null` for DNF/DNS, despite the schema; those go last. */
export function classificationOrder(rows: readonly SessionResult[]): DriverNumber[] {
  const pos = (r: SessionResult) => (typeof r.position === "number" ? r.position : Number.POSITIVE_INFINITY);
  return [...rows].sort((x, y) => pos(x) - pos(y)).map((r) => r.driver_number);
}
