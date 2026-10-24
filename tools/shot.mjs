// SPDX-FileCopyrightText: 2026 Michal Kohutek
// SPDX-License-Identifier: GPL-3.0-only

// Screenshot harness for the baby-log PWA. Run from the repo root:
//   NODE_PATH=$(npm root -g) node tools/shot.mjs --scenario plain --tag before
// Scenarios are defined in SCENARIOS below; add one per UI state you want to review.
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const globalRoot = process.env.PLAYWRIGHT_ROOT || execSync("npm root -g").toString().trim();
const { chromium } = require(path.join(globalRoot, "playwright"));

const BASE = process.env.BASE_URL || "http://127.0.0.1:8472";
const OUT_DIR = process.env.OUT_DIR || "screenshots";

const DEVICES = {
  desktop: { width: 1440, height: 900, dsf: 1, touch: false },
  "desktop-narrow": { width: 1024, height: 768, dsf: 1, touch: false },
  ipadmini: { width: 744, height: 1133, dsf: 2, touch: true },
  "ipadmini-land": { width: 1133, height: 744, dsf: 2, touch: true },
  iphone14: { width: 390, height: 844, dsf: 3, touch: true },
  "iphone15pm": { width: 430, height: 932, dsf: 3, touch: true },
  "iphone15pm-land": { width: 932, height: 430, dsf: 3, touch: true },
};

const SCENARIOS = {
  plain: async () => {},
  today: async (page) => { await tab(page, "today"); },
  log: async (page) => { await tab(page, "log"); },
  logweek: async (page) => { await tab(page, "log"); const w = page.locator("[data-range=week]").first(); if (await w.count()) await w.click(); },
  stats: async (page) => { await tab(page, "stats"); },
  statsweight: async (page) => { await tab(page, "stats"); const b = page.locator("[data-chart=weight]").first(); if (await b.count()) await b.click(); },
  statssleep: async (page) => { await tab(page, "stats"); const b = page.locator("[data-chart=sleep]").first(); if (await b.count()) await b.click(); },
  insights: async (page) => { await tab(page, "insights"); },
  doctor: async (page) => {
    await tab(page, "doctor");
    const info = await page.evaluate(() => ({
      q: document.querySelectorAll("#view-doctor .qlist")[0]?.querySelectorAll("li").length || 0,
      checklist: document.querySelectorAll("#view-doctor .qlist")[1]?.querySelectorAll("li").length || 0,
    }));
    console.log(`doctor: questions=${info.q} checklist=${info.checklist}`);
  },
  doctorcopy: async (page) => {
    await tab(page, "doctor");
    const b = page.locator("button[data-copyq]:visible").first();
    if (await b.count()) { await b.click(); await page.waitForTimeout(300); }
  },
  dialogdiaper: async (page) => { await clickFirst(page, "[data-quick=diaper]"); },
  dialogfeed: async (page) => { await clickFirst(page, "[data-quick=feed]"); },
  dialogedit: async (page) => {
    await tab(page, "log");
    await clickFirst(page, "[data-edit]");
  },
  timerbar: async (page) => { await tab(page, "today"); },
  settings: async (page) => { await clickFirst(page, "#settingsBtn"); },
  reminders: async (page) => { await tab(page, "today"); },
  taskmgr: async (page) => { await tab(page, "today"); const b = page.locator(".reminders-card button.mini").first(); if (await b.count()) await b.click(); },
  taskadd: async (page) => { await tab(page, "today"); const m = page.locator(".reminders-card button.mini").first(); if (await m.count()) await m.click(); await page.waitForTimeout(300); const a = page.locator("#taskBody .primary").first(); if (await a.count()) await a.click(); },
  taskedit: async (page) => { await tab(page, "today"); const m = page.locator(".reminders-card button.mini").first(); if (await m.count()) await m.click(); await page.waitForTimeout(300); const e = page.locator("#taskBody .mini").first(); if (await e.count()) await e.click(); },
  acksheet: async (page) => { await ackFlow(page); },
  kontrola: async (page) => { await tab(page, "kontrola"); },
  kontrolactx: async (page) => {
    await tab(page, "kontrola");
    const k = page.locator(".kcard .klink").first();
    if (await k.count()) { await k.click(); await page.waitForTimeout(400); }
  },
  acksave: async (page) => {
    await ackFlow(page);
    const s = page.locator("#ackSave");
    if (await s.count()) { await s.click(); await page.waitForTimeout(500); }
    const n = await page.evaluate(() => JSON.parse(localStorage.getItem("baby.dismissed") || "[]").length);
    console.log(`acksave: localStorage dismissed+acked entries = ${n}`);
  },
  mgrlist: async (page) => {
    await ackFlow(page);
    const s = page.locator("#ackSave");
    if (await s.count()) { await s.click(); await page.waitForTimeout(400); }
    await clickFirst(page, "[data-mgr]");
  },
  doctor: async (page) => {
    await tab(page, "doctor");
    const info = await page.evaluate(() => ({
      q: document.querySelectorAll("#view-doctor .qlist")[0]?.querySelectorAll("li").length || 0,
      checklist: document.querySelectorAll("#view-doctor .qlist")[1]?.querySelectorAll("li").length || 0,
    }));
    console.log(`doctor: questions=${info.q} checklist=${info.checklist}`);
  },
  doctorcopy: async (page) => {
    await tab(page, "doctor");
    const b = page.locator("button[data-copyq]:visible").first();
    if (await b.count()) { await b.click(); await page.waitForTimeout(350); }
  },
  more: async (page) => { await tab(page, "insights"); },
};

async function ackFlow(page) {
  await tab(page, "insights");
  const b = page.locator('#view-insights button[data-act="ack"]').first();
  if (!(await b.count())) { console.error("ackFlow: no ack button found"); return; }
  await b.click();
  await page.waitForTimeout(350);
  const ta = page.locator("#ackBody textarea");
  if (await ta.count()) await ta.fill("spala 5 h v kuse – vedome jsme ji nebudili");
}

async function tab(page, name) {
  const btn = page.locator(`[data-tab="${name}"]:visible`).first();
  if (await btn.count() && !(await btn.evaluate((el) => el.classList.contains("on")))) await btn.click({ timeout: 5000 });
  await page.waitForTimeout(450);
}

async function clickFirst(page, selector) {
  const loc = page.locator(`${selector}:visible`).first();
  if (await loc.count()) await loc.click({ timeout: 5000 });
  await page.waitForTimeout(400);
}

const args = process.argv.slice(2);
const getArg = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};

const scenarioNames = getArg("scenario", "today").split(",");
const deviceNames = getArg("devices", Object.keys(DEVICES).join(",")).split(",");
const tag = getArg("tag", "shot");
const mode = getArg("mode", "viewport"); // viewport | full
const locale = getArg("locale", "sk-SK");
const uiLang = getArg("uiLang", ""); // force baby.lang (en|sk); empty = follow browser locale
const uiTheme = getArg("uiTheme", ""); // force baby.theme (light|dark|auto); empty = follow OS

fs.mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
for (const dname of deviceNames) {
  const d = DEVICES[dname];
  if (!d) { console.error(`unknown device ${dname}`); continue; }
  for (const sname of scenarioNames) {
    const scenario = SCENARIOS[sname];
    if (!scenario) { console.error(`unknown scenario ${sname}`); continue; }
    const context = await browser.newContext({
      viewport: { width: d.width, height: d.height },
      deviceScaleFactor: d.dsf,
      hasTouch: d.touch,
      isMobile: d.touch,
      locale,
      colorScheme: process.env.DARK ? "dark" : "light",
      reducedMotion: process.env.ANIM ? "no-preference" : "reduce",
      ignoreHTTPSErrors: process.env.INSECURE_TLS === "1",
    });
    try { await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(BASE).origin }); } catch {}
    if (uiLang || uiTheme) {
      await context.addInitScript(([l, t]) => {
        if (l) localStorage.setItem("baby.lang", l);
        if (t) localStorage.setItem("baby.theme", t);
      }, [uiLang, uiTheme]);
    }
    const page = await context.newPage();
    page.on("pageerror", (e) => console.error(`[pageerror ${dname}/${sname}]`, e.message));
    page.on("console", (m) => { if (m.type() === "error") console.error(`[console ${dname}/${sname}]`, m.text()); });
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    try { await scenario(page); } catch (e) { console.error(`scenario ${sname} on ${dname}: ${e.message}`); }
    await page.waitForTimeout(350);
    const stamp = new Date().toISOString().slice(0, 10);
    const file = path.join(OUT_DIR, `${stamp}-${tag}-${sname}-${dname}.png`);
    await page.screenshot({ path: file, fullPage: mode === "full" });
    console.log(file);
    await context.close();
  }
}
await browser.close();
