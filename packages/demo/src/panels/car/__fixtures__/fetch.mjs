import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pickReferenceLap } from "../track";

const OPENF1 = "https://api.openf1.org/v1";
const out = (name) => fileURLToPath(new URL(name, import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, attempt = 0) {
  const res = await fetch(url);
  if (res.status === 429 && attempt < 5) {
    await sleep(5000 * 2 ** attempt);
    return get(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const rows = await res.json();
  console.log(`${rows.length ?? "obj"} ${url}`);
  await sleep(1600);
  return rows;
}
const openf1 = (path, query) => get(`${OPENF1}/${path}?${query}`);

const pick = (rows, keys) => rows.map((r) => Object.fromEntries(keys.filter((k) => r[k] != null).map((k) => [k, r[k]])));
const iso = (t) => new Date(t).toISOString().replace("Z", "");
const lapWindow = (lap) => {
  const start = Date.parse(lap.date_start);
  return `date>=${iso(start)}&date<=${iso(start + lap.lap_duration * 1000)}`;
};

const LAP_KEYS = (
  "session_key meeting_key driver_number lap_number date_start lap_duration duration_sector_1 duration_sector_2 duration_sector_3 " +
  "i1_speed i2_speed st_speed is_pit_out_lap segments_sector_1 segments_sector_2 segments_sector_3"
).split(" ");
const CAR_KEYS = ["session_key", "meeting_key", "driver_number", "date", "speed", "throttle", "brake", "n_gear", "drs"];
const LOC_KEYS = ["session_key", "meeting_key", "driver_number", "date", "x", "y"];

const RACES = [
  { name: "abu-dhabi", session: 9839, circuit: 70, snapshotAt: "2025-12-07T13:17:30" },
  { name: "monza", session: 9912, circuit: 39, snapshotAt: "2025-09-07T13:16:50" },
];
const TEL_LAP = 10;
const TEL_A = 1;
const TEL_B = 4;

for (const race of RACES) {
  const s = `session_key=${race.session}`;
  const drivers = await openf1("drivers", s);
  const allLaps = await openf1("laps", s);
  const raceControl = await openf1("race_control", s);
  const circuit = await get(`https://api.multiviewer.app/api/v1/circuits/${race.circuit}/2025`);

  const laps = allLaps.filter((l) => l.lap_number <= 5 || (l.lap_number === TEL_LAP && [TEL_A, TEL_B].includes(l.driver_number)));
  const ref = pickReferenceLap(laps);
  const refFilter = `${s}&driver_number=${ref.driver_number}&${lapWindow(ref)}`;
  const telLap = (n) => laps.find((l) => l.lap_number === TEL_LAP && l.driver_number === n);
  const telFilter = (n) => `${s}&driver_number=${n}&${lapWindow(telLap(n))}`;
  const snapStart = Date.parse(`${race.snapshotAt}Z`);

  writeFileSync(
    out(`${race.name}.json`),
    JSON.stringify({
      drivers: pick(drivers, ["session_key", "meeting_key", "driver_number", "name_acronym", "team_name", "team_colour"]),
      laps: pick(laps, LAP_KEYS),
      raceControl: pick(
        raceControl.filter((r) => ["YELLOW", "DOUBLE YELLOW", "CLEAR", "GREEN", "RED"].includes(r.flag)),
        ["session_key", "meeting_key", "date", "lap_number", "category", "flag", "scope", "sector", "message"],
      ),
      circuit: {
        rotation: circuit.rotation,
        marshalSectors: circuit.marshalSectors.map(({ number, trackPosition }) => ({
          number,
          trackPosition,
        })),
      },
      refLap: {
        location: pick(await openf1("location", refFilter), LOC_KEYS),
        carData: pick(await openf1("car_data", refFilter), CAR_KEYS),
      },
      lap10: {
        a: pick(await openf1("car_data", telFilter(TEL_A)), CAR_KEYS),
        b: pick(await openf1("car_data", telFilter(TEL_B)), CAR_KEYS),
        snapshot: pick(
          (await openf1("location", `${s}&date>=${iso(snapStart)}&date<${iso(snapStart + 1000)}`)).filter((r) =>
            [TEL_A, TEL_B].includes(r.driver_number),
          ),
          LOC_KEYS,
        ),
      },
    }),
  );
}
