// SPDX-FileCopyrightText: 2026 Michal Kohutek
// SPDX-License-Identifier: GPL-3.0-only

// Generates tools/appicon-preview-static.html + tools/appicon-candidates/*.svg
// Run: node tools/gen-appicons.mjs   (output is fully static — no JavaScript needed to view)
import fs from "node:fs";
import path from "node:path";

const PAC = (hole) => `
      <g transform="rotate(-24 256 256)">
        <ellipse cx="256" cy="300" rx="101" ry="68" fill="#000" opacity=".16"/>
        <circle cx="256" cy="356" r="42" fill="#eef6f1"/>
        <ellipse cx="256" cy="292" rx="100" ry="66" fill="#fff"/>
        <circle cx="252" cy="158" r="40" fill="none" stroke="#fff" stroke-width="20"/>
        <rect x="245" y="188" width="22" height="40" rx="11" fill="#fff"/>
        <ellipse cx="170" cy="290" rx="12" ry="16" fill="${hole}"/>
        <ellipse cx="342" cy="290" rx="12" ry="16" fill="${hole}"/>
        <circle cx="256" cy="292" r="24" fill="#cde8db"/>
        <circle cx="256" cy="292" r="9" fill="#fff"/>
      </g>`;

const CANDIDATES = [
  {
    id: "face", name: "A · Baby face (current)", bg: "cream", wallpaperOk: true,
    desc: "Today's icon for comparison — abstract smiling baby on cream.",
    inner: `
      <circle cx="256" cy="214" r="118" fill="#b4532a"/>
      <path d="M170 300c0 66 39 108 86 108s86-42 86-108" fill="none" stroke="#24201c" stroke-width="26" stroke-linecap="round"/>
      <circle cx="212" cy="200" r="17" fill="#f5f1ea"/><circle cx="300" cy="200" r="17" fill="#f5f1ea"/>
      <path d="M214 252c14 14 70 14 84 0" fill="none" stroke="#f5f1ea" stroke-width="18" stroke-linecap="round"/>
      <path d="M330 96c22 0 40 18 40 40s-18 40-40 40" fill="none" stroke="#2f6f4f" stroke-width="24" stroke-linecap="round"/>`,
  },
  {
    id: "heart", name: "B · Heart (matches in-app brand)", bg: "teal",
    desc: "Plump heart on the app's teal — consistent with the logo chip in the header.",
    inner: `<path d="M256 402C172 334 118 270 118 208c0-56 44-92 92-92 20 0 38 10 46 24 8-14 26-24 46-24 48 0 92 36 92 92 0 62-54 126-138 194z" fill="#fff"/>`,
  },
  {
    id: "rattle", name: "C · Rattle", bg: "teal",
    desc: "Rattle with a heart cut-out; unmistakably baby, reads well at 16px.",
    inner: `
      <circle cx="256" cy="188" r="108" fill="#fff"/>
      <path d="M256 234C226 208 204 186 204 162c0-22 16-38 34-38 9 0 15 6 18 14 3-8 9-14 18-14 18 0 34 16 34 38 0 24-22 46-52 72z" fill="#1d7f8c"/>
      <rect x="234" y="292" width="44" height="96" rx="22" fill="#fff"/>
      <circle cx="256" cy="414" r="44" fill="#fff"/>`,
  },
  {
    id: "footprints", name: "D · Footprints", bg: "cream",
    desc: "Baby foot + tiny foot (parent & child). Warm, personal, very distinctive.",
    inner: `
      <g fill="#2e2a25">
        <ellipse cx="206" cy="310" rx="76" ry="102" transform="rotate(-14 206 310)"/>
        <circle cx="148" cy="176" r="27"/><circle cx="204" cy="150" r="22"/><circle cx="254" cy="146" r="19"/><circle cx="300" cy="158" r="16"/><circle cx="338" cy="180" r="14"/>
        <ellipse cx="382" cy="408" rx="46" ry="62" transform="rotate(16 382 408)"/>
        <circle cx="338" cy="330" r="15"/><circle cx="368" cy="314" r="13"/><circle cx="398" cy="310" r="12"/><circle cx="426" cy="320" r="10"/>
      </g>`,
  },
  {
    id: "stroller", name: "E · Stroller", bg: "coral",
    desc: "Pram silhouette; activity-log flavor on a warm coral.",
    inner: `
      <path d="M136 296a120 120 0 0 1 240 0z" fill="#fff"/>
      <rect x="120" y="296" width="272" height="30" rx="15" fill="#fff"/>
      <path d="M356 232l44-72" stroke="#fff" stroke-width="26" stroke-linecap="round"/>
      <circle cx="190" cy="398" r="36" fill="#fff"/><circle cx="330" cy="398" r="36" fill="#fff"/>
      <path d="M190 350h140" stroke="#fff" stroke-width="22" stroke-linecap="round"/>`,
  },
  {
    id: "pacifier", name: "F · Pacifier", bg: "mint",
    desc: "Simple geometry (ring + shield + teat) — stays crisp at favicon sizes.",
    inner: `
      <circle cx="256" cy="150" r="58" fill="none" stroke="#fff" stroke-width="26"/>
      <ellipse cx="256" cy="272" rx="118" ry="86" fill="#fff"/>
      <circle cx="256" cy="394" r="46" fill="#fff"/>`,
  },
  {
    id: "moon", name: "G · Moon & stars", bg: "ink",
    desc: "Sleep-diary mood on dark ink — also doubles as the app's dark theme identity.",
    inner: `
      <circle cx="236" cy="286" r="140" fill="#f2ecdf"/>
      <circle cx="308" cy="230" r="122" fill="#28241f"/>
      <path d="M398 128q8 28 36 36-28 8-36 36-8-28-36-36 28-8 36-36z" fill="#f2ecdf"/>
      <path d="M150 116q5 18 23 23-18 5-23 23-5-18-23-23 18-5 23-23z" fill="#f2ecdf"/>`,
  },
  {
    id: "monogram", name: "H · Monogram m", bg: "cream",
    desc: "Soft rounded 'm' with a coral heart accent — quiet, modern, typographic.",
    inner: `
      <path d="M148 396V272c0-36 30-62 66-62 30 0 54 22 58 52v134M272 262c4-30 28-52 58-52 36 0 66 26 66 62v124" fill="none" stroke="#2e2a25" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M148 184c-18-18-32-34-32-50 0-14 11-24 24-24 5 0 8 4 8 8 0-4 3-8 8-8 13 0 24 10 24 24 0 16-14 32-32 50z" fill="#e2694f"/>`,
  },
  {
    id: "pacifier-mint", name: "I · Pacifier Pro — mint", bg: "mint",
    desc: "Detailed, tilted pacifier: saddle shield with vent holes, grip button, teat behind, pull ring.",
    inner: PAC("#2e9e7f"),
  },
  {
    id: "pacifier-teal", name: "J · Pacifier Pro — brand teal", bg: "teal",
    desc: "Same glyph on the app's teal gradient — more consistent with the in-app accent.",
    inner: PAC("#1d6f86"),
  },
];

const BG = {
  cream: "linear-gradient(150deg,#faf5ec,#efe7d8)",
  teal: "linear-gradient(150deg,#2fae9c,#1d6f8a)",
  coral: "linear-gradient(150deg,#ef9068,#dd5f45)",
  mint: "linear-gradient(150deg,#45c9a4,#279c7e)",
  ink: "linear-gradient(150deg,#3a342d,#211d19)",
};

const svgOf = (c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="${BG[c.bg].includes("linear") ? { cream: "#f5efe4", teal: "#248a86", coral: "#e4784f", mint: "#36b591", ink: "#2b2620" }[c.bg] : c.bg}"/>${c.inner}</svg>`;

fs.mkdirSync("tools/appicon-candidates", { recursive: true });
for (const c of CANDIDATES) fs.writeFileSync(`tools/appicon-candidates/${c.id}.svg`, svgOf(c));

const tile = (c, size, radius) => `<div class="tile" style="width:${size}px;height:${size}px;border-radius:${radius}%;background:${BG[c.bg]}"><svg viewBox="0 0 512 512" width="${Math.round(size * 0.62)}" height="${Math.round(size * 0.62)}">${c.inner}</svg></div>`;
const favicon = (c, s) => `<span class="fav" style="width:${s}px;height:${s}px;border-radius:${Math.round(s * 0.23)}px;background:${BG[c.bg]}"><svg viewBox="0 0 512 512" width="${s}" height="${s}">${c.inner}</svg></span>`;

let rows = "";
for (const c of CANDIDATES) {
  rows += `<div class="row">
    <div class="meta"><b>${c.name}</b><span>${c.desc}</span></div>
    <div class="cell wp-light">${tile(c, 108, 23.5)}<i>Denník mimi</i></div>
    <div class="cell wp-dark">${tile(c, 108, 23.5)}<i>Denník mimi</i></div>
    <div class="cell tabs">
      <span class="tabrow"><span class="tab">${favicon(c, 32)}<em>Denník mimi — kontrola</em></span></span>
      <span class="tabrow small"><span class="tab">${favicon(c, 16)}<em>Denník mimi</em></span></span>
    </div></div>`;
}

const html = `<!doctype html>
<html lang="sk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>App icon candidates — Denník mimi</title>
<style>
  body { margin:0; font-family:system-ui,-apple-system,"Segoe UI",sans-serif; background:#eef1f3; color:#20302e; padding:26px 30px 60px; }
  h1 { font-size:22px; margin:0 0 4px; } .sub { color:#5e706c; font-size:13.5px; margin-bottom:20px; }
  .head, .row { display:grid; grid-template-columns: 280px 190px 190px 1fr; gap:18px; align-items:center; }
  .head { font-size:12px; color:#5e706c; text-transform:uppercase; letter-spacing:.06em; padding:0 8px 10px; }
  .row { background:#fff; border:1px solid #dfe6e8; border-radius:16px; padding:16px 18px; margin-bottom:12px; }
  .meta b { display:block; font-size:15px; margin-bottom:4px; } .meta span { font-size:12.5px; color:#5e706c; line-height:1.35; display:block; }
  .cell { display:grid; place-items:center; border-radius:12px; padding:12px 8px; }
  .cell i { font-style:normal; font-size:11px; margin-top:7px; }
  .wp-light { background:linear-gradient(160deg,#dce7f0,#eef2ec); } .wp-light i { color:#39504c; }
  .wp-dark { background:linear-gradient(160deg,#2a3248,#171d28); } .wp-dark i { color:#c3ccd8; }
  .tile { display:grid; place-items:center; box-shadow:0 4px 14px rgba(15,35,32,.18); overflow:hidden; }
  .tabs { justify-items:start; gap:10px; background:#e7ebed; }
  .tabrow { display:flex; align-items:center; }
  .tab { display:flex; align-items:center; gap:8px; background:#fff; border-radius:9px 9px 0 0; padding:7px 46px 7px 10px; font-size:12px; color:#3c4a48; box-shadow:0 -1px 4px rgba(0,0,0,.05); max-width:250px; }
  .tab em { font-style:normal; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .tabrow.small .tab { font-size:11px; padding:5px 60px 5px 8px; }
  .fav { display:inline-block; flex:none; overflow:hidden; line-height:0; }
  .foot { margin-top:18px; font-size:12.5px; color:#5e706c; }
</style></head><body>
<h1>App icon / favicon candidates</h1>
<div class="sub">Home-screen tiles (light & dark wallpaper) and in-browser-tab favicon sizes (32px, 16px). SVG sources: tools/appicon-candidates/*.svg</div>
<div class="head"><span></span><span>iOS tile · light wallpaper</span><span>iOS tile · dark wallpaper</span><span>Favicon in tab (32px / 16px)</span></div>
${rows}
<div class="foot">Note: glyphs are drawn inside the central ~60% of the canvas, so Android maskable icons (safe zone) and iOS squircle cropping both work without changes. SVG files have rx-96 rounded backgrounds for "any" purpose.</div>
</body></html>`;

fs.writeFileSync("tools/appicon-preview-static.html", html);
console.log("wrote tools/appicon-preview-static.html + tools/appicon-candidates/*.svg (" + CANDIDATES.length + " candidates)");
