#!/usr/bin/env node
/**
 * Lane E fixture fetch script.
 *
 * Pulls real OpenF1 rows for the two lanes-shared 2025 race sessions
 * (session_key 9839 = Abu Dhabi GP, session_key 9912 = Monza / Italian GP,
 * per .claude/autopilot/pitwall/OWNER-PROTOCOL.md and DATA.md) and writes
 * them, unmodified aside from JSON pretty-printing, into the panel
 * fixtures directories consumed by shape.test.ts.
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

async function writeJson(relPath, data) {
  const outPath = path.join(__dirname, "..", relPath);
  await writeFile(outPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`wrote ${outPath}`);
}

async function main() {
  for (const [label, { sessionKey, slug }] of Object.entries(SESSIONS)) {
    console.log(`--- ${label} (session_key=${sessionKey}) ---`);

    const weather = await fetchEndpoint("weather", sessionKey);
    await writeJson(`weather/__fixtures__/${slug}-2025.json`, weather);
    await sleep(PACE_MS);

    const raceControl = await fetchEndpoint("race_control", sessionKey);
    await sleep(PACE_MS);

    const teamRadio = await fetchEndpoint("team_radio", sessionKey);
    await writeJson(`racecontrol/__fixtures__/${slug}-race-2025.json`, {
      raceControl,
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
