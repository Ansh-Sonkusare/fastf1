#!/usr/bin/env node
// Regenerates the real-race fixtures: node fetch.mjs
import { writeFileSync } from "node:fs";

const SESSIONS = { 9693: "australia", 9858: "vegas", 9920: "zandvoort" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(path) {
  const res = await fetch(`https://api.openf1.org/v1/${path}`);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  await sleep(1000);
  return res.json();
}

for (const [key, name] of Object.entries(SESSIONS)) {
  const laps = (await get(`laps?session_key=${key}`)).map((l) => ({
    session_key: l.session_key,
    meeting_key: l.meeting_key,
    driver_number: l.driver_number,
    lap_number: l.lap_number,
    date_start: l.date_start ?? undefined,
    lap_duration: l.lap_duration ?? undefined,
  }));
  const result = (await get(`session_result?session_key=${key}`)).map((r) => ({
    driver_number: r.driver_number,
    position: r.position,
    number_of_laps: r.number_of_laps,
    dnf: r.dnf,
    dns: r.dns,
    dsq: r.dsq,
  }));
  writeFileSync(new URL(`./${name}.json`, import.meta.url), `${JSON.stringify({ laps, result })}\n`);
  console.log(name, laps.length, "laps", result.length, "results");
}
