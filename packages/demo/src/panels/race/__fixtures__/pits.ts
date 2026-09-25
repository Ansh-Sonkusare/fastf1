import type { OpenF1Pit } from "@f1/core";
import abuDhabiPitsJson from "./abuDhabiPits.json";
import monzaPitsJson from "./monzaPits.json";

// Real OpenF1 rows, every completed stop, session_key 9839 (2025 Abu Dhabi GP
// race) and 9912 (2025 Monza GP race). Regenerate with `node fetch.mjs` in
// this directory.
export const abuDhabiPits = abuDhabiPitsJson as unknown as OpenF1Pit[];
export const monzaPits = monzaPitsJson as unknown as OpenF1Pit[];
