import { getCarData, getOpenF1Laps } from "@f1/core";

const sessionKey = 11280;
const driverNumber = 3;

async function getTelemetry() {
  const [carData, laps] = await Promise.all([
    getCarData(sessionKey, driverNumber),
    getOpenF1Laps(sessionKey, driverNumber),
  ]);

  const validLaps = laps?.filter((l) => l.lap_duration !== null) ?? [];
  const fastestLap = validLaps.sort((a, b) => (a.lap_duration ?? 0) - (b.lap_duration ?? 0))[0];

  if (!fastestLap) throw new Error("No laps found");

  const lapStartDate = new Date(fastestLap.date_start!);
  const lapEndTime = new Date(lapStartDate.getTime() + (fastestLap.lap_duration ?? 0) * 1000);

  const lapData = carData!.filter((d) => {
    const date = new Date(d.date);
    return date >= lapStartDate && date <= lapEndTime;
  });

  const lapDuration = fastestLap.lap_duration ?? 0;
  const timeOffset = lapStartDate.getTime();

  const points = lapData.map((d) => ({
    time: (new Date(d.date).getTime() - timeOffset) / 1000,
    speed: d.speed ?? 0,
    throttle: d.throttle ?? 0,
    brake: d.brake,
    rpm: d.rpm ?? 0,
    gear: d.n_gear ?? 0,
  }));

  return { lap: fastestLap, points, lapDuration };
}

const clear = "\x1b[2J\x1b[1;1H";
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
};

function move(y: number, x: number) {
  return `\x1b[${y};${x}H`;
}

async function main() {
  const { lap, points, lapDuration } = await getTelemetry();

  const cols = 120;
  const rows = 30;
  const maxSpeed = 350;
  const maxTime = lapDuration;

  process.stdout.write(clear);

  const title = `${colors.bright}🏎️  Miami 2026 - Max Verstappen | Lap ${lap.lap_number} | ${lapDuration.toFixed(3)}s | ${points.length} pts`;
  process.stdout.write(move(1, 1) + title + "\n");
  process.stdout.write(move(2, 1) + `${colors.dim}Speed (cyan), Throttle (green), Brake (red), RPM (yellow) | Gear below${colors.reset}`);

  const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill(" "));

  function pointToGrid(time: number, value: number, maxVal: number, colorChar: string) {
    const x = Math.floor((time / maxTime) * (cols - 1));
    const y = Math.floor((1 - value / maxVal) * (rows - 1));
    if (x >= 0 && x < cols && y >= 0 && y < rows) {
      grid[y][x] = colorChar;
    }
  }

  for (const p of points) {
    pointToGrid(p.time, p.speed, maxSpeed, "█");
  }

  const throttleRows = 8;
  const throttleStart = rows - throttleRows - 4;
  const throttleGrid = Array.from({ length: throttleRows }, () => Array(cols).fill(" "));
  for (const p of points) {
    const x = Math.floor((p.time / maxTime) * (cols - 1));
    const y = Math.floor((1 - p.throttle / 100) * (throttleRows - 1));
    if (x >= 0 && x < cols && y >= 0 && y < throttleRows) {
      throttleGrid[y][x] = "▄";
    }
  }

  const brakeRows = 4;
  const brakeStart = throttleStart - brakeRows - 2;
  const brakeGrid = Array.from({ length: brakeRows }, () => Array(cols).fill(" "));
  for (const p of points) {
    if (p.brake === 100) {
      const x = Math.floor((p.time / maxTime) * (cols - 1));
      if (x >= 0 && x < cols) brakeGrid[0][x] = "█";
    }
  }

  const rpmRows = 6;
  const rpmStart = brakeStart - rpmRows - 2;
  const rpmGrid = Array.from({ length: rpmRows }, () => Array(cols).fill(" "));
  const maxRpm = 13000;
  for (const p of points) {
    const x = Math.floor((p.time / maxTime) * (cols - 1));
    const y = Math.floor((1 - p.rpm / maxRpm) * (rpmRows - 1));
    if (x >= 0 && x < cols && y >= 0 && y < rpmRows) {
      rpmGrid[y][x] = "·";
    }
  }

  let yPos = 4;
  for (let row = 0; row < rows; row++) {
    const speedVal = Math.round(maxSpeed - (row / (rows - 1)) * maxSpeed);
    const label = speedVal.toString().padStart(3);
    const line = grid[row].join("");
    
    let prefix = `${colors.dim}${label}${colors.reset} │`;
    if (row === 0) prefix = `${colors.bright}${colors.cyan}${label}${colors.reset} │`;
    if (row === rows - 1) prefix = `${colors.dim}${label}${colors.reset} │`;
    
    process.stdout.write(move(yPos++, 1) + prefix + line);
  }

  process.stdout.write(move(yPos++, 1) + `${colors.dim}    └${"─".repeat(cols)}┘${colors.reset}`);

  const timeSteps = 10;
  let timeLabel = "";
  for (let i = 0; i <= timeSteps; i++) {
    const t = (i / timeSteps) * maxTime;
    const label = t.toFixed(0).padStart(3);
    const pos = Math.floor((i / timeSteps) * (cols - 1)) + 5;
    timeLabel = label;
  }
  process.stdout.write(move(yPos++, 1) + `${colors.dim}    0s${"".padStart(40)}lap center${"".padStart(40)}${maxTime.toFixed(0)}s${colors.reset}`);

  yPos++;
  process.stdout.write(move(yPos++, 1) + `${colors.dim}${"─".repeat(cols + 5)}${colors.reset}`);

  for (let row = rpmRows - 1; row >= 0; row--) {
    const rpmVal = Math.round(maxRpm - (row / (rpmRows - 1)) * maxRpm);
    const label = row === rpmRows - 1 ? "RPM " : "    ";
    const line = rpmGrid[row].join("");
    process.stdout.write(move(yPos++, 1) + `${colors.dim}${label}${colors.reset} │${colors.yellow}${line}${colors.reset}`);
  }

  yPos++;
  for (let row = brakeRows - 1; row >= 0; row--) {
    const line = brakeGrid[row].join("");
    const label = row === brakeRows - 1 ? "BRAKE" : "      ";
    process.stdout.write(move(yPos++, 1) + `${colors.dim}${label}${colors.reset} │${colors.red}${line}${colors.reset}`);
  }

  yPos++;
  for (let row = throttleRows - 1; row >= 0; row--) {
    const throttleVal = Math.round(100 - (row / (throttleRows - 1)) * 100);
    const label = row === throttleRows - 1 ? "THR  " : "     ";
    const line = throttleGrid[row].join("");
    process.stdout.write(move(yPos++, 1) + `${colors.dim}${label}${colors.reset} │${colors.green}${line}${colors.reset}`);
  }

  yPos++;
  process.stdout.write(move(yPos++, 1) + `${colors.dim}${"─".repeat(cols + 5)}${colors.reset}`);

  const gearGrid = Array(cols).fill(" ");
  for (const p of points) {
    const x = Math.floor((p.time / maxTime) * (cols - 1));
    if (x >= 0 && x < cols) gearGrid[x] = p.gear.toString();
  }
  process.stdout.write(move(yPos++, 1) + `${colors.magenta}GEAR │${gearGrid.join("")}${colors.reset}`);

  yPos++;
  process.stdout.write(
    move(yPos++, 1) + 
    `${colors.dim}Speed: ${Math.min(...points.map(p => p.speed))}-${Math.max(...points.map(p => p.speed))} km/h | ` +
    `Throttle: 0-100% | ` +
    `RPM: ${Math.min(...points.map(p => p.rpm))}-${Math.max(...points.map(p => p.rpm))}${colors.reset}`
  );

  console.log("\n" + colors.yellow + "→ bun run examples/speed-interactive.ts" + colors.reset);
}

main().catch(console.error);