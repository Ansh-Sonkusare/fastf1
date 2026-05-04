import { getSchedule, getRaceResults, getDriverStandings } from "@f1/core";

async function main() {
  console.log("Fetching 2024 F1 Schedule...\n");

  const schedule = await getSchedule(2024);
  console.log(`Season: ${schedule.season}`);
  console.log(`Total races: ${schedule.Races.length}`);

  console.log("\n--- Next 3 Races ---");
  schedule.Races.slice(0, 3).forEach((race, i) => {
    console.log(`${i + 1}. ${race.raceName} - ${race.date}`);
  });

  console.log("\nFetching race results (round 3)...\n");

  const results = await getRaceResults(2024, 3);
  if (results[0]?.Results) {
    console.log(`${results[0].raceName} - Top 5:`);
    results[0].Results.slice(0, 5).forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.driverId} (${r.constructorId}) - ${r.points} pts`);
    });
  }

  console.log("\nFetching driver standings...\n");

  const standings = await getDriverStandings(2024);
  console.log("Top 5 Drivers:");
  standings.slice(0, 5).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.Driver.driverId} - ${s.points} pts`);
  });

  console.log("\n✅ All API calls successful!");
}

main().catch(console.error);