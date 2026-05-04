import {
  getMeetings,
  getSessions,
  getDrivers,
  getOpenF1Laps,
  getCarData,
} from "@f1/core";

const YEAR = 2026;
const DRIVER_NUMBER = 3; // Max Verstappen

async function main() {
  console.log("🏎️  Miami 2026 - Max Verstappen Fastest Lap Speed Graph\n");
  console.log("=".repeat(60));

  // Get session
  const meetings = await getMeetings(YEAR);
  const miami = meetings.find(m => m.meeting_name === "Miami Grand Prix");
  if (!miami) return;

  const sessions = await getSessions(miami.meeting_key);
  const raceSession = sessions.find(s => s.session_name === "Race");
  if (!raceSession) return;

  // Get driver laps
  const allLaps = await getOpenF1Laps(raceSession.session_key);
  const driverLaps = allLaps.filter(l => l.driver_number === DRIVER_NUMBER && l.lap_duration);

  // Find fastest lap
  const fastestLap = driverLaps.reduce((best, lap) => 
    !lap.lap_duration ? best : (!best || lap.lap_duration < best.lap_duration) ? lap : best
  , driverLaps[0]);

  if (!fastestLap) {
    console.log("No lap data found!");
    return;
  }

  console.log(`Fastest lap: #${fastestLap.lap_number} - ${fastestLap.lap_duration?.toFixed(3)}s\n`);

  // Get telemetry for this lap
  const allTelemetry = await getCarData(raceSession.session_key, DRIVER_NUMBER);
  
  // Filter to just this lap (approximate - use date range)
  const lapStartTime = fastestLap.date_start;
  const lapDuration = fastestLap.lap_duration! * 1000; // ms
  const lapEndTime = new Date(new Date(lapStartTime).getTime() + lapDuration).toISOString();

  const lapTelemetry = allTelemetry.filter(t => {
    if (!t.date) return false;
    return t.date >= lapStartTime && t.date <= lapEndTime;
  });

  if (lapTelemetry.length === 0) {
    console.log("No telemetry for this lap!");
    return;
  }

  // Sort by timestamp
  lapTelemetry.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  // Extract speed data
  const speeds = lapTelemetry.map(t => t.speed || 0).filter(s => s > 0);
  
  if (speeds.length === 0) {
    console.log("No speed data!");
    return;
  }

  // Create ASCII chart
  const maxSpeed = Math.max(...speeds);
  const minSpeed = Math.min(...speeds);
  const range = maxSpeed - minSpeed;
  const height = 15;
  const width = Math.min(speeds.length, 80);
  
  // Sample data to fit width
  const step = Math.floor(speeds.length / width);
  const sampledSpeeds = [];
  for (let i = 0; i < width; i++) {
    const idx = Math.min(i * step, speeds.length - 1);
    sampledSpeeds.push(speeds[idx]);
  }

  console.log(`Speed Range: ${minSpeed.toFixed(0)} - ${maxSpeed.toFixed(0)} km/h`);
  console.log(`Data Points: ${speeds.length}\n`);

  // Build chart
  const chart: string[][] = Array(height).fill(null).map(() => Array(width).fill(" "));

  for (let i = 0; i < sampledSpeeds.length; i++) {
    const speed = sampledSpeeds[i];
    const barHeight = Math.floor(((speed - minSpeed) / range) * (height - 1));
    for (let h = 0; h <= barHeight; h++) {
      const y = height - 1 - h;
      if (chart[y] && chart[y][i] !== undefined) {
        chart[y][i] = "█";
      }
    }
  }

  // Add labels
  console.log("Speed (km/h)");
  for (let h = 0; h < height; h++) {
    const y = height - 1 - h;
    const speedLabel = Math.floor(minSpeed + (range * y / (height - 1))).toString().padStart(3);
    console.log(`${speedLabel} │${chart[h].join("")}│`);
  }

  // X-axis labels
  const minLabel = Math.floor(minSpeed).toString();
  const maxLabel = Math.floor(maxSpeed).toString();
  console.log(`     └${"─".repeat(width)}┘`);
  console.log(`       ${minLabel}${" ".repeat(width - minLabel.length - maxLabel.length)}${maxLabel}`);

  console.log("\n" + "=".repeat(60));

  // Also show gear/rpm at interesting points
  console.log("\n📊 Gear/RPM Analysis:");
  const gears: Record<number, number[]> = {};
  lapTelemetry.forEach(t => {
    if (t.n_gear !== undefined && t.rpm) {
      if (!gears[t.n_gear]) gears[t.n_gear] = [];
      gears[t.n_gear].push(t.rpm);
    }
  });

  Object.entries(gears).forEach(([gear, rpms]) => {
    const avg = rpms.reduce((a, b) => a + b, 0) / rpms.length;
    const max = Math.max(...rpms);
    console.log(`  Gear ${gear}: avg ${Math.round(avg)} RPM, max ${max} RPM`);
  });
}

main().catch(console.error);