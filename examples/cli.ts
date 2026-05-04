import {
  getSchedule,
  getRaceResults,
  getDriverStandings,
  getConstructorStandings,
  getLaps as getErgastLaps,
  getMeetings,
  getSessions,
  getDrivers,
  getLaps as getOpenF1Laps,
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
    }
  }

  console.log("\n⏱️  OPENF1 LAP DATA (Sector Times + Speed)");
  console.log("-".repeat(50));
  if (meetings.length > 0) {
    const gps = meetings.filter(m => m.meeting_name.includes("Grand Prix"));
    const meeting = gps[0] || meetings[0];
    const sessions = await getSessions(meeting.meeting_key);
    const raceSession = sessions.find(s => s.session_type === "Race");
    
    if (raceSession) {
      console.log(`Session: ${raceSession.session_name}`);
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
    }
  }

  console.log("\n🛞 TYRE STRATEGY");
  console.log("-".repeat(50));
  if (meetings.length > 0) {
    const gps = meetings.filter(m => m.meeting_name.includes("Grand Prix"));
    const meeting = gps[0] || meetings[0];
    const sessions = await getSessions(meeting.meeting_key);
    const raceSession = sessions.find(s => s.session_type === "Race");
    
    if (raceSession) {
      const stints = await getStints(raceSession.session_key);
      console.log(`Total stints: ${stints.length}`);
      
      const driverStints = stints.filter(s => s.driver_number === stints[0]?.driver_number);
      console.log(`\nDriver #${driverStints[0]?.driver_number} strategy:`);
      driverStints.slice(0, 4).forEach((s, i) => {
        console.log(`  Stint ${s.stint_number}: ${s.compound} (Laps ${s.lap_start}-${s.lap_end})`);
      });
    }
  }

  console.log("\n🔧 PIT STOPS");
  console.log("-".repeat(50));
  if (meetings.length > 0) {
    const gps = meetings.filter(m => m.meeting_name.includes("Grand Prix"));
    const meeting = gps[0] || meetings[0];
    const sessions = await getSessions(meeting.meeting_key);
    const raceSession = sessions.find(s => s.session_type === "Race");
    
    if (raceSession) {
      const pitStops = await getOpenF1PitStops(raceSession.session_key);
      console.log(`Total pit stops: ${pitStops.length}`);
      
      const fastestStop = pitStops.reduce((best, pit) => {
        if (!pit.pit_duration) return best;
        if (!best || pit.pit_duration < best.pit_duration) return pit;
        return best;
      }, pitStops[0]);

      if (fastestStop) {
        console.log(`\nFastest pit stop: Lap ${fastestStop.lap_number}`);
        console.log(`  Driver: #${fastestStop.driver_number}`);
        console.log(`  Stop duration: ${fastestStop.pit_duration?.toFixed(3)}s`);
        console.log(`  Lane duration: ${fastestStop.lane_duration?.toFixed(3)}s`);
      }
    }
  }

  console.log("\n🌡️  WEATHER");
  console.log("-".repeat(50));
  if (meetings.length > 0) {
    const gps = meetings.filter(m => m.meeting_name.includes("Grand Prix"));
    const meeting = gps[0] || meetings[0];
    const sessions = await getSessions(meeting.meeting_key);
    const raceSession = sessions.find(s => s.session_type === "Race");
    
    if (raceSession) {
      const weather = await getWeather(raceSession.session_key);
      if (weather.length > 0) {
        const latest = weather[weather.length - 1];
        console.log(`Latest weather data:`);
        console.log(`  Air temp: ${latest.air_temperature}°C`);
        console.log(`  Track temp: ${latest.track_temperature}°C`);
        console.log(`  Humidity: ${latest.humidity}%`);
        console.log(`  Wind speed: ${latest.wind_speed} km/h`);
        console.log(`  Rain: ${latest.precipitation}`);
      }
    }
  }

  console.log("\n📊 CAR TELEMETRY (Sample)");
  console.log("-".repeat(50));
  if (meetings.length > 0) {
    const gps = meetings.filter(m => m.meeting_name.includes("Grand Prix"));
    const meeting = gps[0] || meetings[0];
    const sessions = await getSessions(meeting.meeting_key);
    const raceSession = sessions.find(s => s.session_type === "Race");
    
    if (raceSession) {
      const drivers = await getDrivers(raceSession.session_key);
      if (drivers.length > 0) {
        const telemetry = await getCarData(raceSession.session_key, drivers[0].driver_number);
        console.log(`Telemetry points for ${drivers[0].full_name}: ${telemetry.length}`);
        
        const maxSpeed = telemetry.reduce((max, t) => !t.speed ? max : Math.max(max, t.speed), 0);
        console.log(`  Max speed recorded: ${maxSpeed.toFixed(1)} km/h`);
        
        if (telemetry.length > 0) {
          const sample = telemetry[Math.floor(telemetry.length / 2)];
          console.log(`  Sample: Speed ${sample.speed} km/h, RPM ${sample.rpm}, Gear ${sample.n_gear}`);
        }
      }
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ All API calls successful!");
}

main().catch(console.error);