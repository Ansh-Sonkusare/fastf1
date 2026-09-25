#!/usr/bin/env node
// Renders docs/design/undercut-terminal.dc.html and the running demo with the same key presses,
// then writes <out>/<name>.design.png, <name>.app.png and <name>.png (both side by side).
//
//   scripts/verify-demo/side-by-side.mjs --out <dir> --app "?session=9920&t=..." <name>=<keys> ...
//
// <keys> is a comma list of keys pressed in both pages before the shot, e.g. `tyres=7` or `wall=m`.
// An empty list (`desk=`) shoots the initial state. The demo must be up (scripts/verify-demo/demo.sh up).
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(join(homedir(), ".cache/verify-fastf1/package.json"));
const { chromium } = require("playwright-core");

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args.splice(i, 2)[1];
};
const out = resolve(flag("--out", "side-by-side"));
const appQuery = flag("--app", "");
const port = Number(process.env.VERIFY_PORT ?? 3137);
const shots = args.map((a) => {
  const [name, keys = ""] = a.split("=");
  return { name, keys: keys ? keys.split(",") : [] };
});
mkdirSync(out, { recursive: true });

const design = join(repo, "docs/design");
const server = createServer((req, res) => {
  const file = req.url === "/" ? "undercut-terminal.dc.html" : decodeURIComponent(req.url.slice(1));
  try {
    const data = readFileSync(join(design, file));
    res.writeHead(200, { "content-type": file.endsWith(".js") ? "text/javascript" : "text/html" });
    res.end(data);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const designUrl = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const viewport = { width: 1920, height: 1080 };

async function shoot(url, keys, path, settleMs) {
  const page = await browser.newPage({ viewport });
  await page.goto(url);
  await page.waitForTimeout(settleMs);
  for (const key of keys) {
    await page.keyboard.press(key);
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path });
  await page.close();
}

for (const { name, keys } of shots) {
  const d = join(out, `${name}.design.png`);
  const a = join(out, `${name}.app.png`);
  await shoot(designUrl, keys, d, 5000);
  await shoot(`http://127.0.0.1:${port}/${appQuery}`, keys, a, 15000);
  const page = await browser.newPage({ viewport: { width: 1920 * 2 + 20, height: 1080 } });
  const img = (p) => `data:image/png;base64,${readFileSync(p).toString("base64")}`;
  await page.setContent(
    `<body style="margin:0;display:flex;gap:20px;background:#f0f"><img src="${img(d)}"><img src="${img(a)}"></body>`,
  );
  await page.screenshot({ path: join(out, `${name}.png`) });
  await page.close();
  console.log(`wrote ${join(out, `${name}.png`)}`);
}
writeFileSync(join(out, "shots.json"), JSON.stringify({ appQuery, shots }, null, 2));
await browser.close();
server.close();
