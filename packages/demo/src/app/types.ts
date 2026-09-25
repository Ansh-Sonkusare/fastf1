import type { LapBlock } from "./timeline";
import type { SessionKey } from "../data/openf1";

export type DriverNumber = number;

export interface ConsoleSession {
  readonly sessionKey: SessionKey;
  readonly meetingKey: number;
  readonly year: number;
  /** Jolpica round, null when the schedule can't be matched. */
  readonly round: number | null;
  /** "Abu Dhabi Grand Prix" */
  readonly name: string;
  readonly circuit: string;
  readonly dateStart: string;
  readonly dateEnd: string;
}

export interface DriverInfo {
  readonly number: DriverNumber;
  /** "VER" */
  readonly code: string;
  readonly name: string;
  readonly team: string;
  /** "#4781d7" */
  readonly color: string;
}

export interface Focus {
  /** Click in the tower. */
  readonly a: DriverNumber | null;
  /** Shift-click in the tower. */
  readonly b: DriverNumber | null;
}

/** ISO time bounds of a lap. `end` is null if the lap was never completed. */
export interface LapWindow {
  readonly start: string;
  readonly end: string | null;
}

/** Everything a panel gets. The shell renders panels only once the session is loaded. */
export interface PanelProps {
  readonly session: ConsoleSession;
  /** Replay cursor, 1..totalLaps. */
  readonly lap: number;
  readonly totalLaps: number;
  readonly playing: boolean;
  readonly focus: Focus;
  readonly drivers: ReadonlyMap<DriverNumber, DriverInfo>;
  /** The race lap `lap` as the leader ran it (first car to start it to first car to finish it). */
  readonly lapWindow: LapWindow | null;
  /** One driver's own lap. Use this, not lapWindow, for anything per driver. */
  readonly lapWindowOf: (driver: DriverNumber, lap: number) => LapWindow | null;
  /** The fixed 10-lap block containing `lap` for one driver. Fetch car_data/location by this window. */
  readonly lapBlockOf: (driver: DriverNumber, lap: number) => LapBlock | null;
  readonly setFocus: (focus: Focus) => void;
}
