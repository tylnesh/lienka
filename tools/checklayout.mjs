// Layout checker: flags overflow, clipped buttons, clipped text and tabbar occlusion per view/device.
import { createRequire } from "node:module";
import path from "node:path";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync("npm root -g").toString().trim(), "playwright"));

const BASE = process.env.BASE_URL || "http://127.0.0.1:8472";
const DEVICES = {
  desktop: { width: 1440, height: 900, dsf: 1, touch: false },
  ipadmini: { width: 744, height: 1133, dsf: 2, touch: true },
  iphone14: { width: 390, height: 844, dsf: 2, touch: true },
  iphone15pm: { width: 430, height: 932, dsf: 2, touch: true },
};
const VIEWS = ["today", "log", "stats", "kontrola", "insights", "doctor"];

function probe() {
  const vw = innerWidth;
  const out = { hOverflow: document.documentElement.scrollWidth - vw, issues: [] };
  const path = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.className && typeof el.className === "string") s += "." + el.className.split(/\s+/).filter(Boolean).slice(0, 3).join(".");
    if (el.parentElement) el.parentElement.getAttribute("data-x");
    return s;
  };
  document.querySelectorAll("body *").forEach((el) => {
    if (el.closest("dialog:not([open])") || el.closest(".hidden") || !el.offsetParent && el.position !== "fixed") return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (r.right > vw + 1.5) out.issues.push({ type: "rightOverflow", sel: path(el), right: Math.round(r.right), text: (el.textContent || "").slice(0, 40) });
    if (el.scrollWidth > el.clientWidth + 5 && getComputedStyle(el).textOverflow !== "ellipsis") {
      const cs = getComputedStyle(el);
      const badgeOverhang = el.classList && el.classList.contains("qi") && el.querySelector(".playbadge");
      if (!(cs.overflowX === "auto" || cs.overflowX === "scroll") && !badgeOverhang) out.issues.push({ type: "clipped", sel: path(el), sw: el.scrollWidth, cw: el.clientWidth, text: (el.textContent || "").slice(0, 40) });
    }
  });
  // buttons whose label wraps to >1 line or overflows the pill
  document.querySelectorAll("button").forEach((b) => {
    const r = b.getBoundingClientRect();
    if (r.height === 0) return;
    const spanTallest = Math.max(0, ...[...b.childNodes].filter(n => n.nodeType === 3 || n.tagName === "SPAN").map(n => (n.getBoundingClientRect?.().height || 0)));
    if (spanTallest > r.height * 1.25) out.issues.push({ type: "btnWrap", sel: path(b), text: b.textContent.slice(0, 40) });
  });
  // last content element vs fixed tabbar
  const main = document.getElementById("main");
  window.scrollTo(0, document.body.scrollHeight);
  const tb = document.querySelector(".tabbar");
  if (tb && main.lastElementChild) {
    const kids = [...main.querySelectorAll(":scope > *")].filter(el => !el.classList.contains("hidden"));
    const last = kids[kids.length - 1];
    if (last) {
      const lr = last.getBoundingClientRect();
      const tbr = tb.getBoundingClientRect();
      if (lr.bottom > tbr.top + 2 && getComputedStyle(document.getElementById("main")).paddingBottom !== "0px") {
        // allow: body has bottom padding? flag only when scrolling can't reveal it
        out.tabBarPad = { lastBottomVsTabTop: Math.round(tbr.top - lr.bottom), mainPadBottom: getComputedStyle(main).paddingBottom };
      } else {
        out.tabBarPad = { lastBottomVsTabTop: Math.round(tbr.top - lr.bottom), mainPadBottom: getComputedStyle(main).paddingBottom };
      }
    }
  }
  return out;
}

const browser = await chromium.launch();
const results = [];
for (const [dname, d] of Object.entries(DEVICES)) {
  const ctx = await browser.newContext({ viewport: { width: d.width, height: d.height }, deviceScaleFactor: d.dsf, hasTouch: d.touch, isMobile: d.touch, locale: "sk-SK", colorScheme: process.env.DARK ? "dark" : "light", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => results.push({ dev: dname, view: "*", issue: { type: "pageerror", sel: e.message } }));
  await page.goto(BASE, { waitUntil: "networkidle" });
  for (const view of VIEWS) {
    await page.evaluate((v) => go(v), view);
    await page.waitForTimeout(700);
    const res = await page.evaluate(probe);
    for (const iss of res.issues) results.push({ dev: dname, view, ...iss });
    if (res.hOverflow > 1) results.push({ dev: dname, view, type: "docHScroll", px: res.hOverflow });
  }
  await ctx.close();
}
await browser.close();
for (const r of results) console.log(`${r.dev}/${r.view}\t${r.type}\t${r.sel || ""}\t${r.text || r.px || ""}\t${r.right ?? ""}${r.sw ? " " + r.sw + ">" + r.cw : ""}`);
console.log(`total issues: ${results.length}`);
