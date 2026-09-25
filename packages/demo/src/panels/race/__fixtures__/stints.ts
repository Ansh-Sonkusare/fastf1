import type { Stint } from "@f1/core";
import abuDhabiStintsJson from "./abuDhabiStints.json";
import monzaStintsJson from "./monzaStints.json";

// Real OpenF1 rows, full grid, session_key 9839 (2025 Abu Dhabi GP race) and
// 9912 (2025 Monza GP race). Regenerate with `node fetch.mjs` in this directory.
export const abuDhabiStints = abuDhabiStintsJson as unknown as Stint[];
export const monzaStints = monzaStintsJson as unknown as Stint[];
