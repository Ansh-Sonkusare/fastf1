import {
  getSchedule,
  getRaceResults,
  getDriverStandings,
  getConstructorStandings,
  getLaps,
} from "@f1/core";

const YEAR = 2025;

async function main() {
  console.log(`🏎️  F1 CLI Demo - ${YEAR} Season\n`);
  console.log("=".repeat(50));

  console.log("\n📅 SCHEDULE");
  console.log("-".repeat(50));
  const schedule = await getSchedule(YEAR);
  console.log(`Total races: ${schedule.Races.length}`);
  console.log("Next 3 races:");
  schedule.Races.slice(0, 3).forEach((race, i) => {
    console.log(`  ${i + 1}. ${race.raceName} (${race.date}) - ${race.Circuit.circuitName}`);
  });

  console.log("\n🏁 RACE RESULTS");
  console.log("-".repeat(50));
  const latestRound = schedule.Races.length > 5 ? 5 : schedule.Races.length;
  const raceResults = await getRaceResults(YEAR, latestRound);
  if (raceResults[0]?.Results) {
    console.log(`${raceResults[0].raceName} - Top 5:`);
    raceResults[0].Results.slice(0, 5).forEach((r, i) => {
      const time = r.Time?.time ? ` (${r.Time.time})` : "";
      console.log(`  ${i + 1}. ${r.Driver?.driverId || r.driverId} - ${r.points} pts${time}`);
    });
  }

  console.log("\n🏆 DRIVER STANDINGS");
  console.log("-".repeat(50));
  const driverStandings = await getDriverStandings(YEAR);
  console.log("Top 10 drivers:");
  driverStandings.slice(0, 10).forEach((s, i) => {
    const wins = s.wins ? ` (${s.wins} wins)` : "";
    console.log(`  ${i + 1}. ${s.Driver?.driverId} - ${s.points} pts${wins}`);
  });

  console.log("\n🏭 CONSTRUCTOR STANDINGS");
  console.log("-".repeat(50));
  const constructorStandings = await getConstructorStandings(YEAR);
  console.log("Top 10 teams:");
  constructorStandings.slice(0, 10).forEach((s, i) => {
    const wins = s.wins ? ` (${s.wins} wins)` : "";
    console.log(`  ${i + 1}. ${s.Constructor?.name} - ${s.points} pts${wins}`);
  });

  console.log("\n⏱️  LAP TIMES (Sample)");
  console.log("-".repeat(50));
  const laps = await getLaps(YEAR, 1);
  if (laps.length > 0) {
    console.log(`Total laps in race 1: ${laps.length}`);
    const firstLap = laps[0];
    if (firstLap.Timings && firstLap.Timings.length > 0) {
      console.log("Lap 1 positions:");
      firstLap.Timings.slice(0, 5).forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.driverId} - ${t.time}`);
      });
    }
  }

  console.log("\n📊 CIRCUITS");
  console.log("-".repeat(50));
  const circuits = [...new Map(schedule.Races.map(r => [r.Circuit.circuitId, r.Circuit])).values()];
  console.log(`${circuits.length} unique circuits this season:`);
  circuits.slice(0, 5).forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.circuitName} (${c.Location.locality}, ${c.Location.country})`);
  });

  console.log("\n" + "=".repeat(50));
  console.log("✅ All API calls successful!");
}

main().catch(console.error);