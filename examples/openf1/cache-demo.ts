import { clearOpenF1Cache, getStints, setOpenF1CacheEnabled, toPromise } from "@f1/core";

const SESSION_KEY = 9472; // 2024 Bahrain Grand Prix, Race

const statuses: number[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const response = await realFetch(input, init);
  statuses.push(response.status);
  return response;
};

const load = () => toPromise(getStints(SESSION_KEY));

async function step(label: string, run: () => Promise<unknown>) {
  const before = statuses.length;
  const started = performance.now();
  await run();
  const ms = Math.round(performance.now() - started);
  const seen = statuses.slice(before);
  console.log(`${label.padEnd(32)} network calls ${seen.length} [${seen.join(", ")}]  ${ms} ms`);
}

async function main() {
  await step("first call", load);
  await step("repeat call", load);
  clearOpenF1Cache();
  await step("3 concurrent calls after clear", () => Promise.all([load(), load(), load()]));
  setOpenF1CacheEnabled(false);
  await step("2 calls with cache disabled", async () => {
    await load();
    await load();
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
