import type { OpenF1Lap } from "@f1/core";
import abuDhabiLapsJson from "./abuDhabiLaps.json";
import monzaLapsJson from "./monzaLaps.json";

// Real OpenF1 rows, driver_number 1 (VER) and 4 (NOR), session_key 9839
// (2025 Abu Dhabi GP race) and 9912 (2025 Monza GP race). Regenerate with
// `node fetch.mjs` in this directory.
export const abuDhabiLaps = abuDhabiLapsJson as unknown as OpenF1Lap[];
export const monzaLaps = monzaLapsJson as unknown as OpenF1Lap[];
