import { getCarData, getOpenF1Laps } from "@f1/core";

const sessionKey = 11280;
const driverNumber = 3; // VER

async function main() {
  console.log("🏎️  Fetching Miami 2026 telemetry...\n");

  const [carData, laps] = await Promise.all([
    getCarData(sessionKey, driverNumber),
    getOpenF1Laps(sessionKey, driverNumber),
  ]);

  console.log("Car data samples:", carData?.slice(0, 2));
  console.log("Laps samples:", laps?.slice(0, 2));

  if (!carData || carData.length === 0) {
    console.error("No car data found");
    return;
  }

  const validLaps = laps?.filter((l) => l.lap_duration !== null && l.lap_duration !== undefined) ?? [];
  const fastestLap = validLaps.sort((a, b) => (a.lap_duration ?? 0) - (b.lap_duration ?? 0))[0];

  if (!fastestLap) {
    console.error("No laps with duration found");
    return;
  }

  console.log(`\nFastest lap: ${fastestLap.lap_number} (${fastestLap.lap_duration?.toFixed(3)}s)`);

  // Filter car data to just this lap using date
  const lapStartDate = new Date(fastestLap.date_start!);
  if (!lapStartDate) {
    console.error("No lap start date");
    return;
  }

  const lapEndTime = new Date(lapStartDate.getTime() + (fastestLap.lap_duration ?? 0) * 1000);

  const lapData = carData.filter((d) => {
    const date = new Date(d.date);
    return date >= lapStartDate && date <= lapEndTime;
  });

  const speed = lapData.map((d) => d.speed ?? 0);
  const brake = lapData.map((d) => (d.brake === 1 ? true : false));
  const throttle = lapData.map((d) => d.throttle ?? 0);

  const minSpeed = Math.min(...speed);
  const maxSpeed = Math.max(...speed);
  const range = maxSpeed - minSpeed;

  console.log(`\nSpeed: ${minSpeed.toFixed(0)} - ${maxSpeed.toFixed(0)} km/h`);
  console.log(`Points: ${speed.length}\n`);

  const cols = 120;
  const rows = 30;

  const render = (values: number[]) => {
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const valRange = maxVal - minVal;
    const graph = Array.from({ length: rows }, () => Array(cols).fill(" "));

    for (let i = 0; i < values.length; i++) {
      const x = Math.floor((i / values.length) * (cols - 1));
      const normalized = valRange > 0 ? (values[i] - minVal) / valRange : 0.5;
      const y = Math.floor((1 - normalized) * (rows - 1));
      if (y >= 0 && y < rows) graph[y][x] = "█";
    }

    return graph.map((row, y) => {
      const val = Math.floor(maxVal - (y / (rows - 1)) * valRange);
      const label = y % 5 === 0 ? val.toString().padStart(3) : "   ";
      return `${label} │${row.join("")}`;
    }).join("\n");
  };

  console.log("Speed Profile:");
  console.log(render(speed));

  console.log("\nBrake Zones (red = braking):");
  const brakeRows = 6;
  const brakeGraph = Array.from({ length: brakeRows }, () => Array(cols).fill(" "));
  for (let i = 0; i < brake.length; i++) {
    const x = Math.floor((i / brake.length) * (cols - 1));
    if (brake[i]) {
      brakeGraph[0][x] = "█";
    }
  }
  console.log(brakeGraph.map((row) => `      │${row.join("")}`).join("\n"));

  console.log("\nThrottle (%):");
  const throttleRows = 6;
  const throttleGraph = Array.from({ length: throttleRows }, () => Array(cols).fill(" "));
  for (let i = 0; i < throttle.length; i++) {
    const x = Math.floor((i / throttle.length) * (cols - 1));
    const y = Math.floor(((throttle[i] ?? 0) / 100) * (throttleRows - 1));
    throttleGraph[throttleRows - 1 - y][x] = "█";
  }
  console.log(throttleGraph.map((row) => `      │${row.join("")}`).join("\n"));
}

main().catch(console.error);