// SPDX-FileCopyrightText: 2026 Michal Kohutek
// SPDX-License-Identifier: GPL-3.0-only

// Records the same Today view at three viewport sizes (phone -> tablet ->
// desktop) for the responsive device-mockup video; assemble with ffmpeg and
// PIL-drawn bezels (see the shell recipe appended in this session's notes).
//   BASE_URL=http://127.0.0.1:8475 node tools/responsive_walk.mjs

import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const globalRoot = require("node:child_process").execSync("npm root -g", { encoding: "utf8" }).trim();
const { chromium } = require(path.join(globalRoot, "playwright"));

const BASE = process.env.BASE_URL || "http://127.0.0.1:8475";
const OUT_DIR = process.env.VIDEO_DIR || "/tmp/lienka-responsive";
const DW = Number(process.env.DWELL_FACTOR || 1); // scale all dwells (shorter takes for the mixed showcase cut)

const SHOTS = [
  { name: "phone", width: 430, height: 932, dsf: 2, scroll: 3 },
  { name: "tablet", width: 834, height: 1112, dsf: 2, scroll: 2 }, // iPad Pro 11" portrait
  { name: "desktop", width: 1440, height: 900, dsf: 2, scroll: 2 },
];

fs.mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
for (const s of SHOTS) {
  const context = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    deviceScaleFactor: s.dsf,
    hasTouch: s.name !== "desktop",
    isMobile: s.name === "phone",
    locale: "en-GB",
    recordVideo: { dir: OUT_DIR, size: { width: s.width * s.dsf, height: s.height * s.dsf } },
  });
  await context.addInitScript(() => localStorage.setItem("baby.lang", "en"));
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(Math.round(1400 * DW)); // settle + let the live timer tick visibly
  for (let i = 0; i < s.scroll; i++) { await page.mouse.wheel(0, 260); await page.waitForTimeout(Math.round(300 * DW)); }
  await page.waitForTimeout(Math.round(700 * DW));
  for (let i = 0; i < s.scroll; i++) { await page.mouse.wheel(0, -260); await page.waitForTimeout(Math.round(300 * DW)); }
  await page.waitForTimeout(Math.round(1400 * DW)); // hold the top of Today at the end
  const video = page.video();
  await context.close();
  const p = await video.path();
  const target = path.join(OUT_DIR, `clip-${s.name}.webm`);
  fs.renameSync(p, target);
  console.log(target);
}
await browser.close();
