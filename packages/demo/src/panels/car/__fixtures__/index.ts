import type { CarData, OpenF1Driver, OpenF1Lap, OpenF1Location, RaceControl } from "@f1/core";
import type { MarshalSector } from "../track";
import abuDhabi from "./abu-dhabi.json";
import monza from "./monza.json";

export interface RaceFixture {
  readonly drivers: readonly Pick<OpenF1Driver, "driver_number" | "name_acronym" | "team_name" | "team_colour">[];
  readonly laps: readonly OpenF1Lap[];
  readonly raceControl: readonly RaceControl[];
  readonly circuit: { readonly rotation: number; readonly marshalSectors: readonly MarshalSector[] };
  readonly refLap: { readonly location: readonly OpenF1Location[]; readonly carData: readonly CarData[] };
  readonly lap10: {
    readonly a: readonly CarData[];
    readonly b: readonly CarData[];
    readonly snapshot: readonly OpenF1Location[];
  };
}

export const ABU_DHABI: RaceFixture = abuDhabi;
export const MONZA: RaceFixture = monza;
