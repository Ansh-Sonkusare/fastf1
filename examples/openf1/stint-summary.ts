import { getDrivers, getStints, toPromise } from "@f1/core";

const SESSION_KEY = 9472; // 2024 Bahrain Grand Prix, Race

async function main() {
  const [stints, drivers] = await Promise.all([
    toPromise(getStints(SESSION_KEY)),
    toPromise(getDrivers(SESSION_KEY)),
  ]);

  for (const driver of drivers) {
    const plan = stints
      .filter((s) => s.driver_number === driver.driver_number)
      .sort((a, b) => a.stint_number - b.stint_number)
      .map((s) => `${s.compound[0]}(${s.lap_start}-${s.lap_end})`);
    console.log(`${driver.name_acronym.padEnd(4)} ${plan.join(" > ")}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
