import { getCarData, getOpenF1Laps } from "@f1/core";

const sessionKey = 11280;
const driverNumber = 3;

async function main() {
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

  console.log(`\n🏎️  Miami 2026 - Max Verstappen Fastest Lap`);
  console.log(`Lap ${fastestLap.lap_number} | ${fastestLap.lap_duration?.toFixed(3)}s | ${lapData.length} points\n`);

  const speed = lapData.map((d) => d.speed ?? 0);
  const brake = lapData.map((d) => d.brake);
  const throttle = lapData.map((d) => d.throttle ?? 0);
  const rpm = lapData.map((d) => d.rpm ?? 0);
  const gear = lapData.map((d) => d.n_gear ?? 0);

  const minSpeed = Math.min(...speed);
  const maxSpeed = Math.max(...speed);
  const minThrottle = Math.min(...throttle);
  const maxThrottle = Math.max(...throttle);
  const minRpm = Math.min(...rpm);
  const maxRpm = Math.max(...rpm);

  console.log(`Speed: ${minSpeed}-${maxSpeed} km/h  |  Throttle: ${minThrottle}-${maxThrottle}%  |  RPM: ${minRpm}-${maxRpm}`);

  const cols = 80;
  const height = 20;

  function drawChart(values: number[], minVal: number, maxVal: number): string[] {
    const lines: string[] = [];
    const range = maxVal - minVal;

    for (let row = 0; row < height; row++) {
      const rowVal = maxVal - (row / (height - 1)) * range;
      let line = "";

      for (let i = 0; i < values.length; i++) {
        const x = Math.floor((i / values.length) * (cols - 1));
        const normalized = range > 0 ? (values[i] - minVal) / range : 0.5;
        const y = Math.floor((1 - normalized) * (height - 1));

        if (y === row) {
          line += "█";
        } else if (x >= line.length) {
          line += " ";
        }
      }

      line = line.padEnd(cols, " ");
      lines.push(`${rowVal.toString().padStart(3)} │${line}│`);
    }

    return lines;
  }

  console.log("\n--- SPEED ---");
  drawChart(speed, minSpeed, maxSpeed).forEach((l) => console.log(l));

  console.log("\n--- THROTTLE ---");
  drawChart(throttle, minThrottle, maxThrottle).forEach((l) => console.log(l));

  console.log("\n--- BRAKE (100=braking) ---");
  drawChart(brake, 0, 100).forEach((l) => console.log(l));

  console.log("\n--- RPM ---");
  drawChart(rpm, minRpm, maxRpm).forEach((l) => console.log(l));

  console.log("\n--- GEAR ---");
  let gearLine = "";
  for (let i = 0; i < gear.length; i++) {
    const x = Math.floor((i / gear.length) * (cols - 1));
    while (gearLine.length < x) gearLine += " ";
    gearLine += gear[i].toString();
  }
  gearLine = gearLine.padEnd(cols, " ");
  console.log(`    │${gearLine}│`);
}

main().catch(console.error);