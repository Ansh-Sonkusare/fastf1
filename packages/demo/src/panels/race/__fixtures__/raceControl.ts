import type { RaceControl } from "@f1/core";
import abuDhabiRaceControlJson from "./abuDhabiRaceControl.json";
import monzaRaceControlJson from "./monzaRaceControl.json";

// Real OpenF1 rows, Flag + SessionStatus categories only, session_key 9839
// (2025 Abu Dhabi GP race) and 9912 (2025 Monza GP race). Regenerate with
// `node fetch.mjs` in this directory.
//
// Neither race had a track-wide (scope "Track") yellow or a Safety Car /
// Virtual Safety Car period: every Flag row with scope "Track" is GREEN
// (pit exit open) or CHEQUERED. The only yellow/double-yellow flags are
// scope "Sector" (local incident marshalling, cars are not slowed
// race-wide). identifySCPeriods over these fixtures returns [] for both
// sessions — see lapTimes.test.ts.
export const abuDhabiRaceControl = abuDhabiRaceControlJson as unknown as RaceControl[];
export const monzaRaceControl = monzaRaceControlJson as unknown as RaceControl[];
