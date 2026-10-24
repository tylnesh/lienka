// SPDX-FileCopyrightText: 2026 Michal Kohutek
// SPDX-License-Identifier: GPL-3.0-only

// Scripted UI walkthrough with Playwright screen recording -> .webm for store/README videos.
//   BASE_URL=http://127.0.0.1:8476 node tools/walkthrough.mjs
// Convert to a YouTube-ready mp4 afterwards:
//   DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 <webm>)
//   ffmpeg -i <webm> -vf "fade=t=in:st=0:d=0.6,fade=t=out:st=$(echo $DUR-0.7|bc):d=0.7,format=yuv420p" \
//          -c:v libx264 -crf 19 -preset medium -movflags +faststart lienka-walkthrough.mp4

import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const globalRoot = require("node:child_process").execSync("npm root -g", { encoding: "utf8" }).trim();
const { chromium } = require(path.join(globalRoot, "playwright"));

const BASE = process.env.BASE_URL || "http://127.0.0.1:8476";
const OUT_DIR = process.env.VIDEO_DIR || "/tmp/lienka-video/rec";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let videoHandle = null;

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  locale: "en-GB",
  colorScheme: "light",
  recordVideo: { dir: OUT_DIR, size: { width: 1440, height: 900 } },
});
await context.addInitScript(() => localStorage.setItem("baby.lang", "en"));
const page = await context.newPage();
videoHandle = page.video();
page.on("pageerror", (e) => console.error("[pageerror]", e.message));

// press Escape if a modal sheet is open (quick-tiles open the entry dialog)
const esc = async () => {
  if (await page.locator("dialog[open]:visible").count()) {
    await page.keyboard.press("Escape");
    await sleep(500);
  }
};

const tab = async (name, dwell = 1900) => {
  await esc();
  const btn = page.locator(`[data-tab="${name}"]:visible`).first();
  if (await btn.count()) await btn.click({ timeout: 5000 });
  await sleep(dwell);
};
const clickFirst = async (sel, dwell = 900) => {
  const loc = page.locator(`${sel}:visible`).first();
  if (await loc.count()) await loc.click({ timeout: 5000 }).catch(() => {});
  await sleep(dwell);
};

await page.goto(BASE, { waitUntil: "networkidle" });
await sleep(1600);

// Today: live timer already running; show the entry sheet, then dismiss it
await clickFirst('[data-quick="walk"]:visible', 2000);
await esc();

// Log: scroll through the shared day-grouped entries
await tab("log", 1400);
for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 240); await sleep(220); }
await sleep(700);
for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, -320); await sleep(200); }

// Charts: flip through Output / Feeds / Sleep / Weight with dwells
await tab("stats", 1500);
for (const chip of ["feeds", "sleep", "weight", "output"]) {
  await clickFirst(`[data-chart="${chip}"]:visible`, 1250);
}

// Tips (insights): sourced signal cards; scroll a little
await tab("insights", 1600);
for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, 260); await sleep(240); }

// Doctor: generated question list + one copy-to-clipboard tap
await tab("doctor", 1500);
await clickFirst('button[data-copyq]:visible', 1300);

// Settings -> dark theme, then Today in dark mode
await clickFirst("#settingsBtn", 1600);
await page.evaluate(() => { localStorage.setItem("baby.theme", "dark"); location.reload(); });
await sleep(1800);
await page.keyboard.press("Escape");
await sleep(500);
await tab("today", 2600);

await context.close(); // flushes the recording
console.log(`webm: ${await videoHandle.path()}`);
await browser.close();
