// Fetches real OpenF1 rows for lane D's fixtures (panels 04/06/07: lap times, tyre
// strategy, pit stops). Run with `node fetch.mjs` from this directory. Writes JSON
// next to this script; the .ts fixture files import that JSON verbatim.
//
// Sessions are fixed to the two races this lane covers: 9839 (2025 Abu Dhabi GP,
// race) and 9912 (2025 Monza GP, race). Never point this at another session_key.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT_DIR = dirname(fileURLToPath(import.meta.url));
const BASE = "https://api.openf1.org/v1";
const PACE_MS = 1500;

const SESSIONS = [
  { key: 9839, name: "abuDhabi" },
  { key: 9912, name: "monza" },
];

// Panel 04 (lap times) charts one focus driver (A) against one compare driver
// (B). Pick the same pair used for the race-lead story at each race: the race
// winner vs. the closest permanent rival on lap 1, both drivers number 1 (VER)
// and 4 (NOR) at both 2025 Abu Dhabi and Monza.
const LAP_DRIVER_NUMBERS = [1, 4];

async function fetchJson(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`${path} -> HTTP ${res.status}`);
  }
  return res.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeJson(name, rows) {
  const file = join(OUT_DIR, `${name}.json`);
  // Minified: these are fixtures, not something anyone hand-edits, and the
  // shaping functions only read a handful of fields per row.
  writeFileSync(file, `${JSON.stringify(rows)}\n`);
  console.log(`wrote ${file} (${rows.length} rows)`);
}

// LapTimeViewModel never reads segments_sector_*; OpenF1's per-metre segment
// arrays are the single biggest field on a lap row and none of panel 04's
// shaping logic touches them.
function pickLapFields(l) {
  const {
    session_key,
    meeting_key,
    driver_number,
    lap_number,
    date_start,
    lap_duration,
    duration_sector_1,
    duration_sector_2,
    duration_sector_3,
    i1_speed,
    i2_speed,
    st_speed,
    is_pit_out_lap,
  } = l;
  return {
    session_key,
    meeting_key,
    driver_number,
    lap_number,
    date_start,
    lap_duration,
    duration_sector_1,
    duration_sector_2,
    duration_sector_3,
    i1_speed,
    i2_speed,
    st_speed,
    is_pit_out_lap,
  };
}

async function fetchSession({ key, name }) {
  const laps = await fetchJson(`/laps?session_key=${key}`);
  const lapsTrimmed = laps
    .filter((l) => LAP_DRIVER_NUMBERS.includes(l.driver_number))
    .map(pickLapFields);
  writeJson(`${name}Laps`, lapsTrimmed);
  await sleep(PACE_MS);

  // Panel 06 gantt shows every driver's stints; keep the full grid.
  const stints = await fetchJson(`/stints?session_key=${key}`);
  writeJson(`${name}Stints`, stints);
  await sleep(PACE_MS);

  // Panel 07 ranks every completed stop this race; keep the full list.
  const pits = await fetchJson(`/pit?session_key=${key}`);
  writeJson(`${name}Pits`, pits);
  await sleep(PACE_MS);

  // Only Flag/SessionStatus rows carry SC/VSC signal (category, flag, scope);
  // the rest is stewarding chatter (track-limit deletions, penalties) that
  // shapeLapTimes never reads. Trimmed for fixture size, not cherry-picked.
  const raceControl = await fetchJson(`/race_control?session_key=${key}`);
  const raceControlTrimmed = raceControl.filter((r) =>
    ["Flag", "SessionStatus"].includes(r.category)
  );
  writeJson(`${name}RaceControl`, raceControlTrimmed);
  await sleep(PACE_MS);
}

for (const session of SESSIONS) {
  await fetchSession(session);
}
