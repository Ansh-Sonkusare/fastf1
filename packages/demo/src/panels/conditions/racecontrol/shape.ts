/**
 * Raw OpenF1 race control row shape, as actually returned by
 * GET https://api.openf1.org/v1/race_control?session_key=... (verified
 * live 2026-09-25 against session_key 9839 and 9912 — see
 * packages/demo/src/panels/conditions/__fixtures__/fetch.mjs).
 *
 * Note: this deliberately does NOT reuse @f1/core's `RaceControl` type.
 * That type's field values are correct, but its optional fields are typed
 * as `T | undefined` (the post-schema-decode shape) whereas the raw wire
 * JSON — and therefore these fixtures — uses literal `null` for absent
 * fields, which doesn't structurally match. Using the real wire shape
 * here keeps the fixture casts honest instead of silently widening them
 * through `unknown`.
 */
export interface OpenF1RaceControlRow {
  session_key: number;
  meeting_key: number;
  date: string;
  category: string;
  flag: string | null;
  scope: string | null;
  sector: number | null;
  lap_number: number | null;
  driver_number: number | null;
  message: string;
  qualifying_phase: string | null;
}

/**
 * Raw OpenF1 team radio row shape, as actually returned by
 * GET https://api.openf1.org/v1/team_radio?session_key=... (verified live
 * 2026-09-25 against session_key 9839 and 9912 — see
 * packages/demo/src/panels/conditions/__fixtures__/fetch.mjs).
 *
 * Note: this deliberately does NOT reuse @f1/core's `TeamRadio` type. That
 * schema (packages/core/src/schemas/openf1.ts) declares required
 * `message` and `driver_id` string fields that the live API never sends —
 * the real payload only ever has `recording_url`, `driver_number` and
 * `date`, with no transcript text at all. Using the real shape here keeps
 * this panel's fixtures and assertions honest; the mismatch should be
 * fixed in @f1/core separately (flagged to the lane B/root owners).
 */
export interface OpenF1TeamRadioRow {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  date: string;
  recording_url: string;
}

/**
 * Event type for race control and radio events.
 * "race-control" events come from getRaceControl()
 * "radio" events come from getTeamRadio() and include audio recording URLs
 */
export type RaceEventType = "race-control" | "radio";

/**
 * Race control and team radio event view model.
 * Represents both race control messages and team radio communications,
 * merged and time-ordered in a single feed.
 */
export interface RaceEvent {
  /** Type of event: race-control or radio */
  type: RaceEventType;
  /** ISO timestamp of the event */
  date: string;
  /**
   * Event message text. Race control events always have one; team radio
   * events never do (OpenF1 doesn't provide a transcript, only the audio
   * clip URL), so this is undefined for radio events.
   */
  message?: string;
  /** Category of the event (Flag, Drs, CarEvent, Other, SessionStatus for race control; always "radio" for radio) */
  category: string;
  /** Flag type if applicable (e.g., "YELLOW", "DOUBLE YELLOW", "CHEQUERED") */
  flag?: string;
  /** Driver number if applicable (race control for specific driver, or team radio sender) */
  driverNumber?: number;
  /** Lap number if applicable */
  lapNumber?: number;
  /** Sector if applicable */
  sector?: number;
  /** Scope of the flag (e.g., "Track", "Sector") */
  scope?: string;
  /** Recording URL for team radio audio playback */
  recordingUrl?: string;
}

/**
 * Categories to filter race control events by. These come from the
 * real OpenF1 `race_control.category` field. "Other" and "SessionStatus"
 * cover most non-flag messages (pit lane open/closed, session status,
 * DRS enabled, investigations); real 2025 data does not carry a distinct
 * "Penalty" or "SafetyCar" category — those show up as "Other" with a
 * descriptive message instead.
 */
export type RaceControlCategory =
  | "Flag"
  | "Drs"
  | "CarEvent"
  | "Other"
  | "SessionStatus";

/**
 * Filter options for race events.
 */
export interface RaceEventFilterOptions {
  /** Include race control events */
  includeRaceControl?: boolean;
  /** Include team radio events */
  includeRadio?: boolean;
  /** Filter by specific race control categories (only applies if includeRaceControl is true) */
  categories?: RaceControlCategory[];
}

function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Shapes raw OpenF1 RaceControl and TeamRadio data into merged, time-ordered view models.
 * Returns events up to and including the given cutoff time.
 *
 * @param raceControl Array of raw RaceControl data from OpenF1
 * @param teamRadio Array of raw team radio rows from OpenF1 (`GET /v1/team_radio`)
 * @param cutoffTime ISO timestamp to filter events (inclusive)
 * @param filterOptions Options to filter events by type and category
 * @returns Array of RaceEvent objects, sorted by date
 */
export function shapeRaceEvents(
  raceControl: readonly OpenF1RaceControlRow[],
  teamRadio: readonly OpenF1TeamRadioRow[],
  cutoffTime: string,
  filterOptions: RaceEventFilterOptions = {
    includeRaceControl: true,
    includeRadio: true,
  }
): RaceEvent[] {
  const events: RaceEvent[] = [];

  // Add race control events
  if (filterOptions.includeRaceControl !== false) {
    const categories = filterOptions.categories
      ? new Set(filterOptions.categories)
      : undefined;

    raceControl.forEach((rc) => {
      if (rc.date <= cutoffTime) {
        const category = rc.category as RaceControlCategory;
        if (!categories || categories.has(category)) {
          events.push({
            type: "race-control",
            date: rc.date,
            message: rc.message,
            category: rc.category,
            flag: nullToUndefined(rc.flag),
            driverNumber: nullToUndefined(rc.driver_number),
            lapNumber: nullToUndefined(rc.lap_number),
            sector: nullToUndefined(rc.sector),
            scope: nullToUndefined(rc.scope),
          });
        }
      }
    });
  }

  // Add team radio events
  if (filterOptions.includeRadio !== false) {
    teamRadio.forEach((tr) => {
      if (tr.date <= cutoffTime) {
        events.push({
          type: "radio",
          date: tr.date,
          category: "radio",
          driverNumber: tr.driver_number,
          recordingUrl: tr.recording_url,
        });
      }
    });
  }

  // Sort by date
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Filters race events by category.
 * Useful for creating filtered views of the race feed.
 *
 * @param events Array of RaceEvent objects to filter
 * @param categories Array of categories to include
 * @returns Filtered array of RaceEvent objects
 */
export function filterRaceEventsByCategory(
  events: RaceEvent[],
  categories: RaceControlCategory[]
): RaceEvent[] {
  const categorySet = new Set(categories);
  return events.filter(
    (event) => categorySet.has(event.category as RaceControlCategory)
  );
}

/**
 * Filters race events by type (race-control or radio).
 *
 * @param events Array of RaceEvent objects to filter
 * @param type Type of events to include
 * @returns Filtered array of RaceEvent objects
 */
export function filterRaceEventsByType(
  events: RaceEvent[],
  type: RaceEventType
): RaceEvent[] {
  return events.filter((event) => event.type === type);
}

/**
 * Filters race events by driver number.
 * Useful for focusing on events relevant to a specific driver.
 *
 * @param events Array of RaceEvent objects to filter
 * @param driverNumber Driver number to filter by
 * @returns Filtered array of RaceEvent objects
 */
export function filterRaceEventsByDriver(
  events: RaceEvent[],
  driverNumber: number
): RaceEvent[] {
  return events.filter((event) => event.driverNumber === driverNumber);
}
