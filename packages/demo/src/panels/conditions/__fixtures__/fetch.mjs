#!/usr/bin/env node
/**
 * Lane E fixture fetch script.
 *
 * Pulls real OpenF1 rows for the two lanes-shared 2025 race sessions
 * (session_key 9839 = Abu Dhabi GP, session_key 9912 = Monza / Italian GP,
 * per .claude/autopilot/pitwall/OWNER-PROTOCOL.md and DATA.md), trims
 * weather and race_control down to an evenly-spaced subset (see `trim`)
 * to keep fixture size sane, and writes the result, values otherwise
 * unmodified, into the panel fixtures directories consumed by
 * shape.test.ts. Team radio rows are kept in full since both sessions
 * only have 22/32 of them.
 *
 * Run with: node packages/demo/src/panels/conditions/__fixtures__/fetch.mjs
 *
 * Paces requests at least 1.5s apart per OWNER-PROTOCOL.md.
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE = "https://api.openf1.org/v1";
const PACE_MS = 1500;

const SESSIONS = {
  abuDhabi: { sessionKey: 9839, slug: "abu-dhabi" },
  monza: { sessionKey: 9912, slug: "monza" },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchEndpoint(endpoint, sessionKey) {
  const url = `${BASE}/${endpoint}?session_key=${sessionKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${url} -> HTTP ${res.status}`);
  }
  const data = await res.json();
  console.log(`fetched ${endpoint} session_key=${sessionKey}: ${data.length} rows`);
  return data;
}

/**
 * Trims a real row array down to at most `max` rows for fixture size,
 * picking evenly spaced indices (always keeping the first and last row)
 * so the trimmed set stays a genuine, ordered subset of what the API
 * returned rather than a synthetic edit. No values are altered.
 */
function trim(rows, max) {
  if (rows.length <= max) return rows;
  const picked = [];
  for (let i = 0; i < max; i++) {
    const idx = Math.round((i * (rows.length - 1)) / (max - 1));
    picked.push(idx);
  }
  const uniqueIdx = [...new Set(picked)].sort((a, b) => a - b);
  return uniqueIdx.map((idx) => rows[idx]);
}

async function writeJson(relPath, data) {
  const outPath = path.join(__dirname, "..", relPath);
  await writeFile(outPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`wrote ${outPath}`);
}

// Fixture size caps (see `trim`). Team radio counts (22/32) are already
// small enough to keep in full.
const MAX_WEATHER_ROWS = 20;
const MAX_RACE_CONTROL_ROWS = 30;

async function main() {
  for (const [label, { sessionKey, slug }] of Object.entries(SESSIONS)) {
    console.log(`--- ${label} (session_key=${sessionKey}) ---`);

    const weather = await fetchEndpoint("weather", sessionKey);
    await writeJson(
      `weather/__fixtures__/${slug}-2025.json`,
      trim(weather, MAX_WEATHER_ROWS)
    );
    await sleep(PACE_MS);

    const raceControl = await fetchEndpoint("race_control", sessionKey);
    await sleep(PACE_MS);

    const teamRadio = await fetchEndpoint("team_radio", sessionKey);
    await writeJson(`racecontrol/__fixtures__/${slug}-race-2025.json`, {
      raceControl: trim(raceControl, MAX_RACE_CONTROL_ROWS),
      teamRadio,
    });
    await sleep(PACE_MS);
  }

  console.log("Done. All fixtures pulled from real OpenF1 session_key 9839 (Abu Dhabi 2025) and 9912 (Monza 2025).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
