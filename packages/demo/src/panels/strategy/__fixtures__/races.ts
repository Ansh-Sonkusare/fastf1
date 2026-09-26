import type { OpenF1Pit, Stint } from "@f1/core";
import { realPitStops } from "../../../app/timeline";
import { type RaceRows, parseRace } from "../race";
import abu from "./abu-dhabi-2025.json";
import monza from "./monza-2025.json";

// The trimmed rows keep every field realPitStops reads. Neither race sent the safety car through the pit lane.
const rowsOf = (f: Omit<RaceRows, "stops" | "totalLaps"> & { readonly pit: readonly unknown[] }): RaceRows => ({
  laps: f.laps,
  stints: f.stints,
  drivers: f.drivers,
  totalLaps: Math.max(...f.laps.map((l) => l.lap_number)),
  stops: realPitStops(f.pit as unknown as OpenF1Pit[], f.stints as unknown as Stint[], new Set()),
});

export const abuRows = rowsOf(abu);
export const abuRace = parseRace(abuRows);
export const monzaRace = parseRace(rowsOf(monza));
