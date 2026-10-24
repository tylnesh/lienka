// SPDX-FileCopyrightText: 2026 Michal Kohutek
// SPDX-License-Identifier: GPL-3.0-only

// ~30 s full-feature UI tour at 1920x1080 for the combined store showcase
// video (see tools/showcase_video.py): live timers, quick-log sheet, shared
// log with photos, chart chips incl. WHO weight bands, sourced tips, doctor
// checklist + copy button, dark theme switch.
//   BASE_URL=http://127.0.0.1:8476 node tools/showcase_walk.mjs

import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const globalRoot = require("node:child_process").execSync("npm root -g", { encoding: "utf8" }).trim();
const { chromium } = require(path.join(globalRoot, "playwright"));

const BASE = process.env.BASE_URL || "http://127.0.0.1:8476";
const OUT_DIR = process.env.VIDEO_DIR || "/tmp/lienka-showcase/rec";
const DW = Number(process.env.DWELL_FACTOR || 1); // scale all dwells

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  locale: "en-GB",
  colorScheme: "light",
  recordVideo: { dir: OUT_DIR, size: { width: 1920, height: 1080 } },
});
await context.addInitScript(() => localStorage.setItem("baby.lang", "en"));
const page = await context.newPage();
const videoHandle = page.video();
page.on("pageerror", (e) => console.error("[pageerror]", e.message));

const esc = async () => {
  if (await page.locator("dialog[open]:visible").count()) {
    await page.keyboard.press("Escape");
    await sleep(400 * DW);
  }
};
const tab = async (name, dwell) => {
  await esc();
  const btn = page.locator(`[data-tab="${name}"]:visible`).first();
  if (await btn.count()) await btn.click({ timeout: 5000 });
  await sleep(dwell * DW);
};
const clickFirst = async (sel, dwell) => {
  const loc = page.locator(`${sel}:visible`).first();
  if (await loc.count()) await loc.click({ timeout: 5000 }).catch(() => {});
  await sleep(dwell * DW);
};

await page.goto(BASE, { waitUntil: "networkidle" });
await sleep(1300);

// Today: live sleep timer bar + one-tap entry sheet
await clickFirst('[data-quick="walk"]:visible', 1600);
await esc();
await sleep(900 * DW);

// Shared log (scroll past day-grouped entries incl. scale photos)
await tab("log", 1200);
for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 320); await sleep(190 * DW); }
await sleep(450 * DW);
for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, -420); await sleep(170 * DW); }

// Charts: output -> feeds -> sleep -> WHO weight bands
await tab("stats", 900);
for (const chip of ["feeds", "sleep", "weight", "output"]) {
  await clickFirst(`[data-chart="${chip}"]:visible`, 950);
}

// Tips: sourced signal cards, gentle scroll
await tab("insights", 1200);
for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 300); await sleep(230 * DW); }

// Doctor: checklist + copy-to-clipboard toast
await tab("doctor", 1200);
await clickFirst("button[data-copyq]:visible", 1100);

// Settings -> dark theme, back to Today in night mode
await clickFirst("#settingsBtn", 1500);
await page.evaluate(() => { localStorage.setItem("baby.theme", "dark"); location.reload(); });
await sleep(1300 * DW);
await page.keyboard.press("Escape");
await sleep(400 * DW);
await tab("today", 3600); // hold the dark hero shot

await context.close(); // flushes the recording
console.log(`webm: ${await videoHandle.path()}`);
await browser.close();
