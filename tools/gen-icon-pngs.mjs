// SPDX-FileCopyrightText: 2026 Michal Kohutek
// SPDX-License-Identifier: GPL-3.0-only

// Renders static/icon.svg + PNG icon assets from the chosen pacifier-mint candidate.
// Run from repo root: node tools/gen-icon-pngs.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync("npm root -g").toString().trim(), "playwright"));

const CAND = fs.readFileSync("tools/appicon-candidates/pacifier-mint.svg", "utf8");
const glyph = CAND.slice(CAND.indexOf("<g"), CAND.lastIndexOf("</g>") + 4);
const GRAD = `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#45c9a4"/><stop offset="1" stop-color="#279c7e"/></linearGradient></defs>`;

fs.writeFileSync("static/icon.svg",
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${GRAD}<rect width="512" height="512" rx="96" fill="url(#bg)"/>${glyph}</svg>`);

const fullBleed = (px) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${px}" height="${px}">${GRAD}<rect width="512" height="512" fill="url(#bg)"/>${glyph}</svg>`;
const browser = await chromium.launch();
for (const [file, px] of [["static/apple-touch-icon.png", 180], ["static/icon-192.png", 192], ["static/icon-512.png", 512]]) {
  const page = await browser.newPage({ viewport: { width: px, height: px }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><body style="margin:0">${fullBleed(px)}</body>`);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: px, height: px } });
  await page.close();
  console.log("wrote", file, fs.statSync(file).size, "bytes");
}
await browser.close();
