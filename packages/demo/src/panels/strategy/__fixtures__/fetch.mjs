import { writeFileSync } from "node:fs";

const SESSIONS = { "abu-dhabi-2025": 9839, "monza-2025": 9912 };
const KEEP = {
  laps: ["session_key", "driver_number", "lap_number", "date_start", "lap_duration", "is_pit_out_lap"],
  stints: ["session_key", "driver_number", "stint_number", "lap_start", "lap_end", "compound", "tyre_age_at_start"],
  pit: ["session_key", "driver_number", "lap_number", "lane_duration", "pit_duration"],
  drivers: ["session_key", "driver_number", "name_acronym", "team_colour"],
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (row, keys) => Object.fromEntries(keys.map((k) => [k, row[k] ?? null]));

for (const [name, sessionKey] of Object.entries(SESSIONS)) {
  const out = { session_key: sessionKey };
  for (const [endpoint, keys] of Object.entries(KEEP)) {
    const res = await fetch(`https://api.openf1.org/v1/${endpoint}?session_key=${sessionKey}`);
    if (!res.ok) throw new Error(`${endpoint} ${sessionKey}: HTTP ${res.status}`);
    out[endpoint] = (await res.json()).map((row) => pick(row, keys));
    console.log(name, endpoint, out[endpoint].length);
    await sleep(1600);
  }
  writeFileSync(new URL(`./${name}.json`, import.meta.url), JSON.stringify(out) + "\n");
}
