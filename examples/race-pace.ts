import {
  getMeetings,
  getSessions,
  getDrivers,
  getOpenF1Laps,
  getStints,
  getOpenF1PitStops as getPitStops,
  getWeather,
  getCarData,
} from "@f1/core";

const YEAR = 2026;
const DRIVER_NUMBER = 3; // Max Verstappen

async function main() {
  console.log(`🏎️  Miami 2026 Race Pace Analysis - Driver #${DRIVER_NUMBER}\n`);
  console.log("=".repeat(50));

  // Step 1: Find Miami GP meeting
  console.log("\n📍 Finding Miami Grand Prix...");
  const meetings = await getMeetings(YEAR);
  const miami = meetings.find(m => m.meeting_name === "Miami Grand Prix");
  if (!miami) {
    console.log("Miami GP not found!");
    return;
  }
  console.log(`Meeting: ${miami.meeting_name} (key: ${miami.meeting_key})`);

  // Step 2: Find Race session
  console.log("\n🏁 Finding Race session...");
  const sessions = await getSessions(miami.meeting_key);
  const raceSession = sessions.find(s => s.session_name === "Race");
  if (!raceSession) {
    console.log("Race session not found!");
    return;
  }
  console.log(`Race session: ${raceSession.session_type} (key: ${raceSession.session_key})`);

  // Step 3: Find driver
  console.log("\n👤 Finding driver #${DRIVER_NUMBER}...");
  const drivers = await getDrivers(raceSession.session_key);
  const targetDriver = drivers.find(d => d.driver_number === DRIVER_NUMBER);
  if (!targetDriver) {
    console.log(`Driver #${DRIVER_NUMBER} not found in session!`);
    return;
  }
  console.log(`Driver: ${targetDriver.full_name} (${targetDriver.team_name})`);

  // Step 4: Get lap data
  console.log("\n⏱️  Fetching lap data...");
  const allLaps = await getOpenF1Laps(raceSession.session_key);
  const driverLaps = allLaps.filter(l => l.driver_number === DRIVER_NUMBER && l.lap_duration);
  console.log(`Total laps: ${driverLaps.length}`);

  if (driverLaps.length === 0) {
    console.log("No lap times found for this driver!");
    return;
  }

  // Race pace analysis
  console.log("\n📊 RACE PACE ANALYSIS");
  console.log("-".repeat(50));

  // Lap times
  const lapTimes = driverLaps.map(l => l.lap_duration!).filter(t => t > 0);
  const avgLapTime = lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length;
  const minLapTime = Math.min(...lapTimes);
  const maxLapTime = Math.max(...lapTimes);

  console.log(`Lap times: ${lapTimes.length}`);
  console.log(`  Average: ${avgLapTime.toFixed(3)}s`);
  console.log(`  Fastest: ${minLapTime.toFixed(3)}s`);
  console.log(`  Slowest: ${maxLapTime.toFixed(3)}s`);

  // Sector times
  console.log("\n📐 Sector Times (average):");
  const s1Times = driverLaps.filter(l => l.duration_sector_1).map(l => l.duration_sector_1!);
  const s2Times = driverLaps.filter(l => l.duration_sector_2).map(l => l.duration_sector_2!);
  const s3Times = driverLaps.filter(l => l.duration_sector_3).map(l => l.duration_sector_3!);

  if (s1Times.length) console.log(`  Sector 1: ${(s1Times.reduce((a,b) => a+b,0)/s1Times.length).toFixed(3)}s`);
  if (s2Times.length) console.log(`  Sector 2: ${(s2Times.reduce((a,b) => a+b,0)/s2Times.length).toFixed(3)}s`);
  if (s3Times.length) console.log(`  Sector 3: ${(s3Times.reduce((a,b) => a+b,0)/s3Times.length).toFixed(3)}s`);

  // Speed traps
  console.log("\n🚀 Speed Traps:");
  const i1Speeds = driverLaps.filter(l => l.i1_speed).map(l => l.i1_speed!);
  const i2Speeds = driverLaps.filter(l => l.i2_speed).map(l => l.i2_speed!);
  const stSpeeds = driverLaps.filter(l => l.st_speed).map(l => l.st_speed!);

  if (i1Speeds.length) console.log(`  Interpolation 1: max ${Math.max(...i1Speeds)} km/h`);
  if (i2Speeds.length) console.log(`  Interpolation 2: max ${Math.max(...i2Speeds)} km/h`);
  if (stSpeeds.length) console.log(`  Speed trap: max ${Math.max(...stSpeeds)} km/h`);

  // Tyre strategy
  console.log("\n🛞 Tyre Strategy:");
  const stints = await getStints(raceSession.session_key);
  const driverStints = stints.filter(s => s.driver_number === DRIVER_NUMBER);
  driverStints.forEach(s => {
    console.log(`  Stint ${s.stint_number}: ${s.compound} (Laps ${s.lap_start}-${s.lap_end})`);
  });

  // Pit stops
  console.log("\n🔧 Pit Stops:");
  const pits = await getPitStops(raceSession.session_key);
  const driverPits = pits.filter(p => p.driver_number === DRIVER_NUMBER);
  if (driverPits.length === 0) {
    console.log("  No pit stops");
  } else {
    driverPits.forEach(p => {
      console.log(`  Lap ${p.lap_number}: ${p.pit_duration?.toFixed(3)}s`);
    });
  }

  // Weather
  console.log("\n🌡️  Weather:");
  const weather = await getWeather(raceSession.session_key);
  if (weather.length > 0) {
    const start = weather[0];
    const end = weather[weather.length - 1];
    console.log(`  Start: ${start.air_temperature}°C air, ${start.track_temperature}°C track`);
    console.log(`  End: ${end.air_temperature}°C air, ${end.track_temperature}°C track`);
  }

  // Telemetry sample
  console.log("\n📊 Telemetry Sample:");
  const telemetry = await getCarData(raceSession.session_key, DRIVER_NUMBER);
  if (telemetry.length > 0) {
    const maxSpeed = telemetry.reduce((max, t) => !t.speed ? max : Math.max(max, t.speed), 0);
    const avgRPM = telemetry.reduce((sum, t) => sum + (t.rpm || 0), 0) / telemetry.length;
    console.log(`  Max speed: ${maxSpeed} km/h`);
    console.log(`  Avg RPM: ${Math.round(avgRPM)}`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ Analysis complete!");
}

main().catch(console.error);