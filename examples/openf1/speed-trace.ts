import { getCarData, getOpenF1Laps, toPromise } from "@f1/core";

const SESSION_KEY = 9472; // 2024 Bahrain Grand Prix, Race
const DRIVER = 1;
const LAP = 10;

async function main() {
  const [lap] = await toPromise(getOpenF1Laps(SESSION_KEY, DRIVER, LAP));
  if (!lap?.date_start || lap.lap_duration === undefined) throw new Error("Lap has no timing");

  const start = new Date(lap.date_start);
  const end = new Date(start.getTime() + lap.lap_duration * 1000);
  const samples = await toPromise(
    getCarData(SESSION_KEY, DRIVER, { dateGt: start.toISOString(), dateLt: end.toISOString() }),
  );

  const speeds = samples.flatMap((s) => (s.speed === undefined ? [] : [s.speed]));
  console.log(`Driver ${DRIVER}, lap ${LAP}: ${lap.lap_duration}s, ${samples.length} samples`);
  console.log(`Top speed ${Math.max(...speeds)} km/h, slowest ${Math.min(...speeds)} km/h`);
  for (const s of samples.filter((_, i) => i % 40 === 0)) {
    console.log(
      `${s.date.slice(11, 23)}  ${String(s.speed).padStart(3)} km/h  gear ${s.n_gear}  throttle ${s.throttle}%`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
