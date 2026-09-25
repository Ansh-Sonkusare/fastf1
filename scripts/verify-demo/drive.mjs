#!/usr/bin/env node
// One browser session against the demo: load the page, run steps in order, write evidence.
//   drive.mjs --out <dir> [--url http://127.0.0.1:3137/] <step>...
// Steps (each one argv token, fields split on the first ':'s):
//   wait-text:<text>             wait (30s) until visible text contains <text>
//   wait-gone:<text>             wait (30s) until no visible element has exactly <text>
//   goto:<path-or-query>         navigate to <url><arg>, e.g. goto:?session=9839&lap=20&a=1&b=4 (deep links)
//   click:<target>               click it; shift-click:<target> holds Shift. <target> is css=<selector>,
//                                or an exact accessible name (button, then aria-label, then visible text)
//   fill:<label>:<value>         set an input by aria-label (range sliders too), e.g. fill:Lap scrubber:20
//   select:<label>:<value>       choose <value> in the <select> by aria-label or the visible label above it
//   click-fastest:<1|2>          click the Nth "Fastest: …" button (legacy telemetry page)
//   wait:<ms>                    idle for <ms> (e.g. to observe background re-probes)
//   assert-network-clean         fail on any 429 or any OpenF1 URL requested twice so far
//   assert-text:<text>           fail unless visible text contains <text>
//   assert-no-text:<text>        fail if visible text contains <text>
//   shot:<name>                  full-page screenshot -> <out>/<name>.png
//   aria:<name>                  ARIA snapshot of <body> -> <out>/<name>.aria.yml
// Always writes <out>/console.log (console + pageerror) and <out>/network.log (upstream API calls + status).
// Exit 1 on any step failure or uncaught page error; the failing state is still screenshotted as <out>/FAIL.png.
import { execSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";

const cache = join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "verify-fastf1");
const require = createRequire(join(cache, "package.json"));
const { chromium } = require("playwright-core");

function chromiumPath() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM;
  try {
    return execSync("command -v chromium", { encoding: "utf8" }).trim();
  } catch {}
  // NixOS: Playwright's downloaded browsers lack libs; use a nix-store chromium (newest first).
  const hits = readdirSync("/nix/store")
    .filter((d) => /^[a-z0-9]{32}-chromium-\d+\.[\d.]+$/.test(d))
    .map((d) => `/nix/store/${d}/bin/chromium`)
    .filter(existsSync)
    .sort((a, b) => b.split("-chromium-")[1].localeCompare(a.split("-chromium-")[1], undefined, { numeric: true }));
  if (hits[0]) return hits[0];
  throw new Error("no chromium found: set CHROMIUM=/path/to/chromium");
}

const args = process.argv.slice(2);
let out = "";
let url = `http://127.0.0.1:${process.env.VERIFY_PORT || 3137}/`;
let width = 1600;
const blocked = [];
const steps = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out") out = args[++i];
  else if (args[i] === "--url") url = args[++i];
  else if (args[i] === "--width") width = Number(args[++i]);
  else if (args[i] === "--block") blocked.push(new RegExp(args[++i]));
  else steps.push(args[i]);
}
if (!out) {
  console.error("usage: drive.mjs --out <dir> [--url <url>] <step>...");
  process.exit(2);
}
mkdirSync(out, { recursive: true });
const consoleLog = join(out, "console.log");
const networkLog = join(out, "network.log");
writeFileSync(consoleLog, "");
writeFileSync(networkLog, "");

const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true });
const page = await browser.newPage({ viewport: { width, height: 1000 } });
for (const re of blocked)
  await page.route(re, (route) => {
    appendFileSync(networkLog, `BLOCKED ${route.request().url()}\n`);
    return route.abort("internetdisconnected");
  });
const pageErrors = [];
let rejectOnPageError;
const pageErrored = new Promise((_, rej) => (rejectOnPageError = rej));
pageErrored.catch(() => {});
page.on("console", (m) => appendFileSync(consoleLog, `[${m.type()}] ${m.text()}\n`));
page.on("pageerror", (e) => {
  pageErrors.push(e.message);
  appendFileSync(consoleLog, `[pageerror] ${e.message}\n`);
  rejectOnPageError(new Error(`uncaught page error: ${e.message}`));
});
const responses = [];
page.on("response", (r) => {
  if (!/api\.openf1\.org|api\.jolpi\.ca/.test(r.url())) return;
  responses.push({ status: r.status(), url: r.url() });
  appendFileSync(networkLog, `${r.status()} ${r.url()}\n`);
});
page.on("requestfailed", (r) => {
  if (/api\.openf1\.org|api\.jolpi\.ca/.test(r.url()))
    appendFileSync(networkLog, `FAILED(${r.failure()?.errorText}) ${r.url()}\n`);
});

const body = page.locator("body");
const selectUnder = (label) =>
  page.getByLabel(label, { exact: true }).or(page.locator(`div:has(> label:text-is("${label}")) > select`)).first();

function target(arg) {
  if (arg.startsWith("css=")) return page.locator(arg.slice(4)).first();
  return page
    .getByRole("button", { name: arg, exact: true })
    .or(page.getByLabel(arg, { exact: true }))
    .or(page.getByText(arg, { exact: true }))
    .first();
}

async function run(step) {
  const [kind, ...rest] = step.split(":");
  const arg = rest.join(":");
  switch (kind) {
    case "wait-text":
      await page.waitForFunction((t) => document.body.innerText.includes(t), arg, { timeout: 30_000 });
      return;
    case "wait-gone":
      await page.getByText(arg, { exact: true }).waitFor({ state: "detached", timeout: 30_000 });
      return;
    case "select": {
      const [label, value] = [rest[0], rest.slice(1).join(":")];
      await selectUnder(label).selectOption(value);
      return;
    }
    case "wait":
      await page.waitForTimeout(Number(arg));
      return;
    case "goto":
      await page.goto(new URL(arg, url).href, { waitUntil: "domcontentloaded" });
      return;
    case "click":
      await target(arg).click({ timeout: 30_000 });
      return;
    case "shift-click":
      await target(arg).click({ modifiers: ["Shift"], timeout: 30_000 });
      return;
    case "fill": {
      const [label, value] = [rest[0], rest.slice(1).join(":")];
      const input = page.getByLabel(label, { exact: true }).first();
      if ((await input.getAttribute("type")) !== "range") return input.fill(value);
      const min = Number((await input.getAttribute("min")) ?? 0);
      await input.focus();
      await input.press("Home");
      for (let i = min; i < Number(value); i++) await input.press("ArrowRight");
      return;
    }
    case "assert-network-clean": {
      const limited = responses.filter((r) => r.status === 429);
      if (limited.length) throw new Error(`429 on ${limited[0].url}`);
      const seen = new Set();
      for (const r of responses.filter((r) => r.url.includes("api.openf1.org"))) {
        if (seen.has(r.url)) throw new Error(`duplicate OpenF1 request ${r.url}`);
        seen.add(r.url);
      }
      return;
    }
    case "click-fastest":
      await page.getByRole("button", { name: /^Fastest:/ }).nth(Number(arg) - 1).click();
      return;
    case "assert-text":
      if (!(await body.innerText()).includes(arg)) throw new Error(`text not found: ${arg}`);
      return;
    case "assert-no-text":
      if ((await body.innerText()).includes(arg)) throw new Error(`unexpected text present: ${arg}`);
      return;
    case "shot":
      await page.screenshot({ path: join(out, `${arg}.png`), fullPage: true });
      return;
    case "aria":
      writeFileSync(join(out, `${arg}.aria.yml`), await body.ariaSnapshot());
      return;
    default:
      throw new Error(`unknown step: ${step}`);
  }
}

let failed = false;
try {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  for (const step of steps) {
    console.log(`step: ${step}`);
    if (pageErrors.length) throw new Error(`uncaught page error: ${pageErrors[0]}`);
    await Promise.race([run(step), pageErrored]);
  }
  console.log(`OK — evidence in ${out}`);
} catch (e) {
  failed = true;
  console.error(`FAIL: ${e.message}`);
  await page.screenshot({ path: join(out, "FAIL.png"), fullPage: true }).catch(() => {});
  writeFileSync(join(out, "FAIL.aria.yml"), await body.ariaSnapshot().catch(() => ""));
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
