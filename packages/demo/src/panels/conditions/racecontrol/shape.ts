import type { RaceControl, TeamRadio } from "@f1/core";

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
  /** Event message text */
  message: string;
  /** Category of the event (Flag, Drs, CarEvent, Other, SessionStatus for race control; always "radio" for radio) */
  category: string;
  /** Flag type if applicable (e.g., "YELLOW", "RED", "CHEQUERED") */
  flag?: string;
  /** Driver number if applicable (race control for specific driver, or team radio sender) */
  driverNumber?: number;
  /** Lap number if applicable */
  lapNumber?: number;
  /** Sector if applicable (1, 2, or 3) */
  sector?: number;
  /** Scope of the flag (e.g., "Track", "Pit lane") */
  scope?: string;
  /** Recording URL for team radio audio playback */
  recordingUrl?: string;
}

/**
 * Categories to filter race control events by.
 * These come from the RaceControl category field.
 */
export type RaceControlCategory =
  | "Flag"
  | "Drs"
  | "CarEvent"
  | "Other"
  | "SessionStatus"
  | "Penalty"
  | "SafetyCar";

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

/**
 * Shapes raw OpenF1 RaceControl and TeamRadio data into merged, time-ordered view models.
 * Returns events up to and including the given cutoff time.
 *
 * @param raceControl Array of raw RaceControl data from OpenF1
 * @param teamRadio Array of raw TeamRadio data from OpenF1
 * @param cutoffTime ISO timestamp to filter events (inclusive)
 * @param filterOptions Options to filter events by type and category
 * @returns Array of RaceEvent objects, sorted by date
 */
export function shapeRaceEvents(
  raceControl: readonly RaceControl[],
  teamRadio: readonly TeamRadio[],
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
            flag: rc.flag,
            driverNumber: rc.driver_number,
            lapNumber: rc.lap_number,
            sector: rc.sector,
            scope: rc.scope,
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
          message: tr.message,
          category: "radio",
          driverNumber: tr.driver_number,
          recordingUrl: (tr as any).recording_url,
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
