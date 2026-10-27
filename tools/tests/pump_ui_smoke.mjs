// SPDX-FileCopyrightText: 2026 Michal Kohutek
// SPDX-License-Identifier: GPL-3.0-only

// v1.23 UI smoke (headless): pumping tiles/kinds/charts, milk bank card + picker,
// length chart with WHO envelope, feed dialog without pump method.
// Setup (seeded DB renders the bank cards and length points):
//   rm -rf /tmp/lienka-seed && mkdir -p /tmp/lienka-seed
//   DATA_DIR=/tmp/lienka-seed PORT=8499 HTTP_PORT=0 BIRTH_DATE=$(date -d '-9 days' +%F) python3 server.py &
//   DATA_DIR=/tmp/lienka-seed BIRTH_DATE=$(date -d '-9 days' +%F) python3 tools/seed_demo.py
//   node tools/tests/pump_ui_smoke.mjs [BASE]     # default http://127.0.0.1:8499
import { createRequire } from "node:module";
import path from "node:path";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync("npm root -g").toString().trim(), "playwright"));

const BASE = process.argv[2] || "http://127.0.0.1:8499";
let failures = 0;
const check = (label, cond) => { console.log((cond ? "PASS" : "FAIL"), label); if (!cond) failures++; };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForSelector(".stats .stat");
await page.waitForTimeout(600);

// Today view: pumping stat with bank chip + the Milk bank card with expiry tags
const todayTxt = await page.textContent("#view-today");
check("today stats show Pumping + Bank", /Pumping/.test(todayTxt) && /Bank \d+ ml/.test(todayTxt));
check("quick row has Start pumping tile", /Start pumping/i.test(await page.textContent(".timerrow2")));
check("Today shows Milk bank card", /Milk bank/.test(todayTxt));
check("bank rows have expired tag", /expired/.test(todayTxt));
check("bank rows have use-by tag", /use by \d\d-\d\d/.test(todayTxt));

// stats view: pumping chart with trend line + length chart with WHO envelope
await page.evaluate(() => { location.hash = "#stats"; });
await page.waitForTimeout(500);
await page.click('[data-chart="pumps"]');
await page.waitForTimeout(400);
const pumpChart = await page.innerHTML("#chartArea");
check("pump bars + supply trend line", /class="bar pump"/.test(pumpChart) && /polyline class="line"/.test(pumpChart));
check("table has Expressed column", /Expressed/.test(await page.innerHTML("#tableArea")));
await page.click('[data-chart="length"]');
await page.waitForTimeout(400);
const lenChart = await page.innerHTML("#chartArea");
check("length points + WHO band + median line", /class="point"/.test(lenChart) && /polygon class="band"/.test(lenChart) && /polyline class="refline"/.test(lenChart));

// insights: Length card citing the WHO envelope
await page.evaluate(() => { location.hash = "#insights"; });
await page.waitForTimeout(1500);
const insTxt = await page.textContent("#view-insights");
check("insights Length card cites WHO band", /Length/.test(insTxt) && /length-for-age|3rd centile/i.test(insTxt));

// feed dialog: pump is gone as a method; expressed bottles get the bank picker
await page.evaluate(() => { location.hash = "#today"; });
await page.waitForTimeout(400);
await page.evaluate(() => openEntryDialog("feed"));
await page.waitForTimeout(500);
check("feed methods exclude Pumping", !/pump/i.test(await page.textContent("#sheetBody")));
const srcField = await page.evaluate(() => {
  const sel = document.querySelector('#sheetBody select[name="source_pump_id"]');
  if (!sel) return { missing: true };
  return { hiddenInitially: sel.closest(".field").classList.contains("hidden") };
});
check("picker present + hidden for breast", !srcField.missing && srcField.hiddenInitially === true);
await page.click('#sheetBody [data-seg-value="bottle_expressed"]');
await page.waitForTimeout(400);
const after = await page.evaluate(() => {
  const sel = document.querySelector('#sheetBody select[name="source_pump_id"]');
  return { hidden: sel.closest(".field").classList.contains("hidden"), options: [...sel.options].map((o) => o.textContent) };
});
check("picker visible for expressed bottle", after.hidden === false);
check("FIFO placeholder + bag options with ml left", /fridge first/.test(after.options[0]) && after.options.some((o) => /ml left/.test(o)) && after.options.some((o) => /Fridge|Freezer/.test(o)));
const bagId = await page.evaluate(() => {
  const sel = document.querySelector('#sheetBody select[name="source_pump_id"]');
  const opt = [...sel.options].find((o) => o.value !== "");
  sel.value = opt.value;
  sel.dispatchEvent(new Event("change", { bubbles: true }));
  return opt.value;
});
await page.fill('#sheetBody input[name="feed_ml"]', "40");
await page.click("#sheetSave");
await page.waitForTimeout(900);
const savedFeed = await page.evaluate(async () => (await (await fetch(`${location.pathname.replace(/\/$/, "")}/api/entries?kind=feed&limit=1`)).json()).entries[0]);
check("saved bottle carries source_pump_id", String(savedFeed.source_pump_id) === String(bagId) && bagId !== "");

// pump dialog: side, storage tier with CDC-dated use-by, volumes
await page.evaluate(() => openEntryDialog("pump"));
await page.waitForTimeout(300);
check("pump dialog has Use-by date field", await page.evaluate(() => !!document.querySelector('#sheetBody input[name="expires_on"][type="date"]')));
const tierState = await page.evaluate(() => {
  const seg = document.querySelector('#sheetBody [data-seg="pump_storage"]');
  const exp = document.querySelector('#sheetBody input[name="expires_on"]');
  const want = new Date(Date.now() + 4 * 864e5).toISOString().slice(0, 10);
  return { fridgeOn: !!seg.querySelector('[data-seg-value="fridge"].on'), auto: exp.value === want, freezer: seg.querySelector('[data-seg-value="freezer"]')?.textContent };
});
check("pump dialog defaults to fridge + prefilled 4-day use-by", tierState.fridgeOn && tierState.auto);
await page.click('#sheetBody [data-seg-value="freezer"]');
await page.waitForTimeout(200);
const frozenDate = await page.evaluate(() => {
  const exp = document.querySelector('#sheetBody input[name="expires_on"]');
  const want = new Date(Date.now() + 180 * 864e5).toISOString().slice(0, 10);
  return exp.value === want;
});
check("switching to freezer re-dates use-by (+180 d)", frozenDate);
await page.fill('#sheetBody input[name="pump_ml"]', "55");
await page.click('#sheetBody [data-seg-value="right"]');
await page.click("#sheetSave");
await page.waitForTimeout(800);
check("pump entry saved from dialog", /Pumping/.test(await page.textContent(".stats")));
await page.evaluate(() => { document.querySelectorAll("dialog[open]").forEach((d) => d.close()); });

// freeze-the-surplus ritual on the Today card: fridge leftovers become freshly dated freezer stock
await page.evaluate(() => { location.hash = "#today"; });
await page.waitForTimeout(700);
const stashTxt1 = await page.textContent("#view-today");
check("bank card groups by storage tier", /Fridge/.test(stashTxt1) && /Freezer/.test(stashTxt1));
await page.locator("#view-today .cardhead button", { hasText: "Freeze" }).first().click();
// Today refreshes on a poll, so the card may briefly re-mount empty — wait for the settled post-freeze pantry
await page.waitForFunction(() => {
  const groups = [...document.querySelectorAll("#view-today .stashgroup")];
  return groups.length > 0 && !groups.some((g) => /Fridge/.test(g.textContent));
}, null, { timeout: 12000 });
check("after freezing, no fridge group header is left", true);
check("freeze button gone when nothing left in fridge", (await page.locator("#view-today .cardhead button", { hasText: "Freeze" }).count()) === 0);

// log: pump filter chip works end to end
await page.evaluate(() => { location.hash = "#log"; });
await page.waitForTimeout(900);
const chips = await page.$$eval("#view-log .chips .chip", (els) => els.map((e) => e.textContent.trim()));
check("log has Pumping filter chip", chips.some((c) => /Pumping/i.test(c)));
const nBefore = await page.evaluate(() => document.querySelectorAll("#view-log .entry").length);
await page.locator("#view-log .chips .chip", { hasText: "Pumping" }).first().click();
await page.waitForFunction((n) => document.querySelectorAll("#view-log .entry").length !== n, nBefore, { timeout: 5000 });
await page.waitForTimeout(300);
const rows = await page.$$eval("#view-log .entry .what .main", (els) => els.map((e) => e.textContent));
check("pump-only filter shows pumping rows", rows.length > 0 && rows.every((r) => /ml/.test(r)));

await browser.close();
const noise = errors.filter((e) => !/favicon|net::ERR_/.test(e));
for (const n of noise) console.log("JS-ERR:", n);
console.log(failures === 0 && noise.length === 0 ? "RESULT: ALL OK" : `RESULT: ${failures} fail / ${noise.length} js errors`);
process.exit(failures === 0 && noise.length === 0 ? 0 : 1);
