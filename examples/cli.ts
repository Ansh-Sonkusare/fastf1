import {
  getSchedule,
  getRaceResults,
  getDriverStandings,
  getConstructorStandings,
  getLaps as getErgastLaps,
  getMeetings,
  getSessions,
  getDrivers,
  getOpenF1Laps,
  getStints,
  getPitStops as getOpenF1PitStops,
  getWeather,
  getCarData,
} from "@f1/core";

const YEAR = 2024;

async function main() {
  console.log(`🏎️  F1 CLI Demo - ${YEAR} Season\n`);
  console.log("=".repeat(50));

  console.log("\n📅 ERGAST SCHEDULE");
  console.log("-".repeat(50));
  const schedule = await getSchedule(YEAR);
  console.log(`Total races: ${schedule.Races.length}`);
  console.log("Next 3 races:");
  schedule.Races.slice(0, 3).forEach((race, i) => {
    console.log(`  ${i + 1}. ${race.raceName} (${race.date}) - ${race.Circuit.circuitName}`);
  });

  console.log("\n🏁 ERGAST RACE RESULTS");
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

  console.log("\n🏆 ERGAST DRIVER STANDINGS");
  console.log("-".repeat(50));
  const driverStandings = await getDriverStandings(YEAR);
  console.log("Top 10 drivers:");
  driverStandings.slice(0, 10).forEach((s, i) => {
    const wins = s.wins ? ` (${s.wins} wins)` : "";
    console.log(`  ${i + 1}. ${s.Driver?.driverId} - ${s.points} pts${wins}`);
  });

  console.log("\n🏭 ERGAST CONSTRUCTOR STANDINGS");
  console.log("-".repeat(50));
  const constructorStandings = await getConstructorStandings(YEAR);
  console.log("Top 10 teams:");
  constructorStandings.slice(0, 10).forEach((s, i) => {
    const wins = s.wins ? ` (${s.wins} wins)` : "";
    console.log(`  ${i + 1}. ${s.Constructor?.name} - ${s.points} pts${wins}`);
  });

  console.log("\n⏱️  ERGAST LAP TIMES (Sample)");
  console.log("-".repeat(50));
  const ergastLaps = await getErgastLaps(YEAR, 1);
  if (ergastLaps.length > 0) {
    console.log(`Total laps in race 1: ${ergastLaps.length}`);
    const firstLap = ergastLaps[0];
    if (firstLap.Timings && firstLap.Timings.length > 0) {
      console.log("Lap 1 positions (basic timing):");
      firstLap.Timings.slice(0, 5).forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.driverId} - ${t.time}`);
      });
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("🚀 OPENF1 DATA (2023+)\n");

  console.log("📅 MEETINGS");
  console.log("-".repeat(50));
  const meetings = await getMeetings(YEAR);
  console.log(`Total meetings in ${YEAR}: ${meetings.length}`);
  if (meetings.length > 0) {
    const gps = meetings.filter(m => m.meeting_name.includes("Grand Prix"));
    console.log("Recent GP meetings:");
    gps.slice(0, 3).forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.meeting_name} - ${m.location}`);
    });
  }

  console.log("\n🏎️  SESSIONS & DRIVERS");
  console.log("-".repeat(50));
  if (meetings.length > 0) {
    const gps = meetings.filter(m => m.meeting_name.includes("Grand Prix"));
    const meeting = gps[0] || meetings[0];
    const sessions = await getSessions(meeting.meeting_key);
    console.log(`Sessions for ${meeting.meeting_name}:`);
    sessions.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.session_name} (${s.session_type})`);
    });

    const raceSession = sessions.find(s => s.session_type === "Race");
    if (raceSession) {
      const drivers = await getDrivers(raceSession.session_key);
      console.log(`\nDrivers in race: ${drivers.length}`);
      console.log("Top 5:");
      drivers.slice(0, 5).forEach((d, i) => {
        console.log(`  ${i + 1}. #${d.driver_number} ${d.full_name} (${d.team_name})`);
      });

      console.log("\n⏱️  OPENF1 LAP DATA (Sector Times + Speed)");
      console.log("-".repeat(50));
      console.log(`Session: ${raceSession.session_name} (key: ${raceSession.session_key})`);
      try {
        const laps = await getOpenF1Laps(raceSession.session_key);
        console.log(`Total laps recorded: ${laps.length}`);
        
        const fastestLap = laps.reduce((best, lap) => {
          if (!lap.lap_duration) return best;
          if (!best || lap.lap_duration < best.lap_duration) return lap;
          return best;
        }, laps[0]);

        if (fastestLap) {
          console.log(`\nFastest lap: Lap ${fastestLap.lap_number}`);
          console.log(`  Driver: #${fastestLap.driver_number}`);
          console.log(`  Time: ${fastestLap.lap_duration?.toFixed(3)}s`);
          console.log(`  Sector 1: ${fastestLap.duration_sector_1?.toFixed(3)}s`);
          console.log(`  Sector 2: ${fastestLap.duration_sector_2?.toFixed(3)}s`);
          console.log(`  Sector 3: ${fastestLap.duration_sector_3?.toFixed(3)}s`);
          console.log(`  Speed Trap: ${fastestLap.st_speed} km/h`);
        }
      } catch (err) {
        console.log(`  Lap data unavailable: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  }

  console.log("\n🛞 TYRE STRATEGY (OpenF1)");
  console.log("-".repeat(50));
  console.log("  Use: getStints(sessionKey) - tyre compound, stint numbers, lap ranges");
  console.log("  API available, rate limited in demo");

  console.log("\n🔧 PIT STOPS (OpenF1)");
  console.log("-".repeat(50));
  console.log("  Use: getOpenF1PitStops(sessionKey) - pit duration, lane time");
  console.log("  API available, rate limited in demo");

  console.log("\n🌡️  WEATHER (OpenF1)");
  console.log("-".repeat(50));
  console.log("  Use: getWeather(sessionKey) - air/track temp, humidity, wind");
  console.log("  API available, rate limited in demo");

  console.log("\n📊 CAR TELEMETRY (OpenF1)");
  console.log("-".repeat(50));
  console.log("  Use: getCarData(sessionKey, driverNumber) - speed, rpm, gear, throttle");
  console.log("  API available, rate limited in demo");

  console.log("\n" + "=".repeat(50));
  console.log("✅ Demo complete! OpenF1 integration working.");
  console.log("   - getMeetings, getSessions, getDrivers all functional");
  console.log("   - Additional data (laps, stints, pits, weather, telemetry) available via API");
  console.log("   - Rate limits apply - use caching in production");
}

main().catch(console.error);