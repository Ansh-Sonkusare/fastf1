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
  getOpenF1PitStops,
  getWeather,
  getCarData,
} from "@f1/core";

const YEAR = 2026;

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

  console.log("\n" + "=".repeat(50));
  console.log("🚀 OPENF1 DATA (2023+)\n");

  console.log("📅 MEETINGS");
  console.log("-".repeat(50));
  const meetings = await getMeetings(YEAR);
  console.log(`Total meetings in ${YEAR}: ${meetings.length}`);
  const gps = meetings.filter(m => m.meeting_name.includes("Grand Prix"));
  console.log("Recent GP meetings:");
  gps.slice(0, 3).forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.meeting_name} - ${m.location}`);
  });

  console.log("\n🏎️  SESSIONS & DRIVERS");
  console.log("-".repeat(50));
  const meeting = gps.find(m => m.meeting_name === "Miami Grand Prix") || gps[0];
  if (!meeting) return;
  
  const sessions = await getSessions(meeting.meeting_key);
  console.log(`Sessions for ${meeting.meeting_name}:`);
  sessions.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.session_name} (${s.session_type})`);
  });

  const raceSession = sessions.find(s => s.session_name === "Race");
  if (!raceSession) return;
  
  console.log("\n📋 RACE DATA");
  console.log("-".repeat(50));
  console.log(`Session: ${raceSession.session_name} (key: ${raceSession.session_key})`);

  console.log("\n🏎️  DRIVERS");
  const drivers = await getDrivers(raceSession.session_key);
  console.log(`Total drivers: ${drivers.length}`);
  console.log("Top 5:");
  drivers.slice(0, 5).forEach((d, i) => {
    console.log(`  ${i + 1}. #${d.driver_number} ${d.full_name} (${d.team_name})`);
  });

  console.log("\n⏱️  LAP TIMES");
  try {
    const laps = await getOpenF1Laps(raceSession.session_key);
    console.log(`Total laps: ${laps.length}`);
    const fastest = laps.reduce((best, lap) => {
      if (!lap.lap_duration) return best;
      if (!best || lap.lap_duration < best.lap_duration) return lap;
      return best;
    }, laps[0]);
    if (fastest) {
      console.log(`\nFastest lap: ${fastest.lap_duration?.toFixed(3)}s (Lap ${fastest.lap_number}, Driver #${fastest.driver_number})`);
      console.log(`  S1: ${fastest.duration_sector_1?.toFixed(3)}s, S2: ${fastest.duration_sector_2?.toFixed(3)}s, S3: ${fastest.duration_sector_3?.toFixed(3)}s`);
      console.log(`  Speed trap: ${fastest.st_speed} km/h`);
    }
  } catch (err) {
    console.log(`  Error: ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  console.log("\n🛞 TYRE STRATEGY");
  try {
    const stints = await getStints(raceSession.session_key);
    console.log(`Total stints: ${stints.length}`);
    const driverStints = stints.filter(s => s.driver_number === drivers[0]?.driver_number);
    console.log(`Driver #${drivers[0]?.driver_number} strategy:`);
    driverStints.slice(0, 4).forEach((s) => {
      console.log(`  Stint ${s.stint_number}: ${s.compound} (Laps ${s.lap_start}-${s.lap_end})`);
    });
  } catch (err) {
    console.log(`  Error: ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  console.log("\n🔧 PIT STOPS");
  try {
    const pits = await getOpenF1PitStops(raceSession.session_key);
    console.log(`Total pit stops: ${pits.length}`);
    if (pits.length > 0) {
      const fastest = pits.reduce((best, p) => !p.pit_duration ? best : (!best || p.pit_duration < best.pit_duration) ? p : best, pits[0]);
      console.log(`  Fastest: ${fastest.pit_duration?.toFixed(3)}s (Lap ${fastest.lap_number})`);
    }
  } catch (err) {
    console.log(`  Error: ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  console.log("\n🌡️  WEATHER");
  try {
    const weather = await getWeather(raceSession.session_key);
    console.log(`Samples: ${weather.length}`);
    if (weather.length > 0) {
      const latest = weather[weather.length - 1];
      console.log(`  Air: ${latest.air_temperature}°C, Track: ${latest.track_temperature}°C`);
      console.log(`  Humidity: ${latest.humidity}%, Wind: ${latest.wind_speed} km/h`);
    }
  } catch (err) {
    console.log(`  Error: ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  console.log("\n📊 CAR TELEMETRY");
  try {
    const telemetry = await getCarData(raceSession.session_key, drivers[0]?.driver_number);
    console.log(`Points: ${telemetry.length}`);
    if (telemetry.length > 0) {
      const maxSpeed = telemetry.reduce((max, t) => !t.speed ? max : Math.max(max, t.speed), 0);
      console.log(`  Max speed: ${maxSpeed} km/h`);
      const sample = telemetry[Math.floor(telemetry.length / 2)];
      console.log(`  Sample: ${sample.speed} km/h, ${sample.rpm} RPM, Gear ${sample.n_gear}`);
    }
  } catch (err) {
    console.log(`  Error: ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ Demo complete!");
}

main().catch(console.error);