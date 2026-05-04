import {
  getMeetings,
  getSessions,
  getDrivers,
  getOpenF1Laps,
  getCarData,
} from "@f1/core";

const YEAR = 2026;
const DRIVER_NUMBER = 3;

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const COLORS = [
  "\x1b[38;5;196m", // red
  "\x1b[38;5;202m", // orange-red
  "\x1b[38;5;208m", // orange
  "\x1b[38;5;214m", // orange-yellow
  "\x1b[38;5;220m", // yellow
  "\x1b[38;5;226m", // bright yellow
  "\x1b[38;5;154m", // lime
  "\x1b[38;5;118m", // green
  "\x1b[38;5;82m",  // bright green
  "\x1b[38;5;46m",  // cyan-green
];

function getColor(value: number, min: number, max: number): string {
  const normalized = (value - min) / (max - min);
  const idx = Math.floor(normalized * (COLORS.length - 1));
  return COLORS[idx];
}

async function main() {
  console.log("\n🏎️  Miami 2026 - Max Verstappen Fastest Lap Telemetry\n");

  // Get session data
  const meetings = await getMeetings(YEAR);
  const miami = meetings.find(m => m.meeting_name === "Miami Grand Prix");
  const sessions = await getSessions(miami!.meeting_key);
  const raceSession = sessions.find(s => s.session_name === "Race");

  // Get lap data
  const allLaps = await getOpenF1Laps(raceSession!.session_key);
  const driverLaps = allLaps.filter(l => l.driver_number === DRIVER_NUMBER && l.lap_duration);
  const fastestLap = driverLaps.reduce((best, lap) => 
    !lap.lap_duration ? best : (!best || lap.lap_duration < best.lap_duration) ? lap : best
  , driverLaps[0]);

  console.log(`📍 Fastest Lap: #${fastestLap?.lap_number} - ${fastestLap?.lap_duration?.toFixed(3)}s`);
  console.log(`   S1: ${fastestLap?.duration_sector_1?.toFixed(3)}s | S2: ${fastestLap?.duration_sector_2?.toFixed(3)}s | S3: ${fastestLap?.duration_sector_3?.toFixed(3)}s`);
  console.log(`   Speed Trap: ${fastestLap?.st_speed} km/h\n`);

  // Get telemetry for fastest lap
  const allTelemetry = await getCarData(raceSession!.session_key, DRIVER_NUMBER);
  const lapStartTime = fastestLap!.date_start;
  const lapDuration = fastestLap!.lap_duration! * 1000;
  const lapEndTime = new Date(new Date(lapStartTime).getTime() + lapDuration).toISOString();

  const lapTelemetry = allTelemetry.filter(t => 
    t.date && t.date >= lapStartTime && t.date <= lapEndTime
  ).sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const speeds = lapTelemetry.map(t => t.speed || 0).filter(s => s > 0);
  const rpms = lapTelemetry.map(t => t.rpm || 0).filter(r => r > 0);
  const gears = lapTelemetry.map(t => t.n_gear || 0).filter(g => g > 0);

  const maxSpeed = Math.max(...speeds);
  const minSpeed = Math.min(...speeds);
  const maxRPM = Math.max(...rpms);

  // Create speed graph (btop style)
  const height = 12;
  const width = 70;

  console.log("┌──────────────────────────────────────────────────────────────────────┐");
  console.log("│ SPEED (km/h)                                                   │");
  
  const step = Math.floor(speeds.length / width);
  const sampled = [];
  for (let i = 0; i < width; i++) {
    sampled.push(speeds[Math.min(i * step, speeds.length - 1)]);
  }

  for (let h = height - 1; h >= 0; h--) {
    const threshold = minSpeed + (maxSpeed - minSpeed) * (h / (height - 1));
    let line = "│ ";
    for (let i = 0; i < sampled.length; i++) {
      if (sampled[i] >= threshold) {
        line += getColor(sampled[i], minSpeed, maxSpeed) + "▀" + RESET;
      } else {
        line += " ";
      }
    }
    line += " │";
    console.log(line);
  }

  // X-axis
  const speedStep = Math.round((maxSpeed - minSpeed) / 5);
  console.log("│ " + "─".repeat(width) + " │");
  console.log(`│ ${minSpeed.toString().padStart(3)}${" ".repeat(width/2 - 3)}${Math.round((maxSpeed+minSpeed)/2)}${" ".repeat(width/2 - 3)}${maxSpeed} │`);

  console.log("├──────────────────────────────────────────────────────────────────────┤");
  console.log("│ RPM (x1000)                                                     │");

  // RPM chart
  const rpmHeight = 8;
  const rpmMax = maxRPM;
  const rpmStep = Math.floor(rpms.length / width);
  const rpmSampled = [];
  for (let i = 0; i < width; i++) {
    rpmSampled.push(rpms[Math.min(i * rpmStep, rpms.length - 1)]);
  }

  for (let h = rpmHeight - 1; h >= 0; h--) {
    const threshold = rpmMax * (h / (rpmHeight - 1));
    let line = "│ ";
    for (let i = 0; i < rpmSampled.length; i++) {
      if (rpmSampled[i] >= threshold) {
        const color = rpmSampled[i] > 11000 ? "\x1b[38;5;196m" : rpmSampled[i] > 9000 ? "\x1b[38;5;208m" : "\x1b[38;5;46m";
        line += color + "█" + RESET;
      } else {
        line += " ";
      }
    }
    line += " │";
    console.log(line);
  }

  console.log("│ " + "─".repeat(width) + " │");
  const rpmLabels = ["0", "3", "6", "9", "12"];
  console.log(`│ ${rpmLabels.join(" ".repeat(width/5 - 1))}${" ".repeat(width - 14)}│`);

  console.log("├──────────────────────────────────────────────────────────────────────┤");
  console.log("│ GEAR                                                            │");

  // Gear visualization
  const gearWidth = width;
  const gearStep = Math.floor(gears.length / gearWidth);
  let gearLine = "│ ";
  let prevGear = 0;
  for (let i = 0; i < gearWidth; i++) {
    const g = gears[Math.min(i * gearStep, gears.length - 1)];
    if (g !== prevGear) {
      const colors = ["", "\x1b[38;5;244m", "\x1b[38;5;200m", "\x1b[38;5;196m", "\x1b[38;5;226m", "\x1b[38;5;118m", "\x1b[38;5;46m", "\x1b[38;5;51m", "\x1b[38;5;45m"];
      gearLine += (colors[g] || "\x1b[38;5;250m") + g.toString() + RESET;
      prevGear = g;
    } else {
      gearLine += " ";
    }
  }
  gearLine += " │";
  console.log(gearLine);

  console.log("│ " + "─".repeat(width) + " │");
  console.log("│ 1         2         3         4         5         6         7         8 │");

  console.log("└──────────────────────────────────────────────────────────────────────┘");

  // Stats
  console.log("\n📊 Statistics:");
  console.log(`   Speed: min ${minSpeed} | max ${maxSpeed} | avg ${Math.round(speeds.reduce((a,b)=>a+b,0)/speeds.length)} km/h`);
  console.log(`   RPM: max ${maxRPM} | avg ${Math.round(rpms.reduce((a,b)=>a+b,0)/rpms.length)}`);
  console.log(`   Telemetry points: ${speeds.length}`);
}

main().catch(console.error);