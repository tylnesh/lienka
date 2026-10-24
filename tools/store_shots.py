#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Michal Kohutek
# SPDX-License-Identifier: GPL-3.0-only

"""Compose Snap Store screenshot cards (uniform 1600x900) from shot.mjs PNGs.

    python3 tools/store_shots.py

Reads the day's store{A,B,C,D} shots from ./screenshots, writes finished cards
to ./screenshots/store-final/. Deterministic; needs Pillow.

Layout contract: text lives in x < 742 (auto-shrunk + word-wrapped), device
mocks live in x >= 776 — phone and desktop window always show the SAME view,
so they can never cover the copy. The script prints an overlap warning per
card if any text run or device edge violates the zones.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join("screenshots", "store-final")
W, H = 1600, 900
BG_TOP, BG_BOT = (14, 17, 22), (23, 38, 48)          # brand #0e1116 -> deep teal haze
ACCENT = (58, 166, 140)
INK = (236, 242, 244)
MUTED = (150, 168, 176)
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

TEXT_R = 742           # right edge of the text zone
DEV_L = 776            # left edge of the device zone
DEV_R = 1544


def font(path, size):
    return ImageFont.truetype(path, size)


def gradient():
    g = Image.new("RGB", (1, H))
    for y in range(H):
        t = y / H
        g.putpixel((0, y), tuple(int(a + (b - a) * t) for a, b in zip(BG_TOP, BG_BOT)))
    return g.resize((W, H))


def rounded(mask_img, radius):
    mask = Image.new("L", mask_img.size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, mask_img.size[0] - 1, mask_img.size[1] - 1], radius=radius, fill=255)
    out = mask_img.convert("RGBA")
    out.putalpha(mask)
    return out


def shadow(canvas, x, y, w, h, radius):
    s = Image.new("RGBA", (w + 80, h + 80), (0, 0, 0, 0))
    ImageDraw.Draw(s).rounded_rectangle([40, 50, w + 40, h + 40], radius=radius, fill=(0, 0, 0, 140))
    canvas.alpha_composite(s.filter(ImageFilter.GaussianBlur(20)), (x - 40, y - 30))


def phone_mock(canvas, img_path, x, target_h):
    """Phone with dark bezel, screen `img_path`, top-left frame at x, given screen height."""
    src = Image.open(img_path)
    sw, sh = src.size
    iw = int(target_h * sw / sh)
    screen = src.convert("RGBA").resize((iw, target_h), Image.LANCZOS)
    bezel, frame = 14, 9
    fw, fh = iw + 2 * (bezel + frame), target_h + 2 * (bezel + frame)
    y = H - 70 - fh
    shadow(canvas, x, y, fw, fh, 50)
    canvas.alpha_composite(rounded(Image.new("RGBA", (fw, fh), (18, 22, 26, 255)), 46), (x, y))
    inner = Image.new("RGBA", (iw + 2 * bezel, target_h + 2 * bezel), (8, 10, 12, 255))
    canvas.alpha_composite(rounded(inner, 36), (x + frame, y + frame))
    canvas.alpha_composite(rounded(screen, 24), (x + frame + bezel, y + frame + bezel))
    return x, fw


def browser_mock(canvas, img_path, x, target_w, y=150):
    """Browser window chrome above the screenshot; returns bottom edge y."""
    src = Image.open(img_path).convert("RGBA")
    sw, sh = src.size
    bh = int(target_w * sh / sw)
    bar = 42
    win = Image.new("RGBA", (target_w, bar + bh), (26, 32, 38, 255))
    win.alpha_composite(src.resize((target_w, bh), Image.LANCZOS), (0, bar))
    shadow(canvas, x, y, target_w, bar + bh, 18)
    canvas.alpha_composite(rounded(win, 16), (x, y))
    d = ImageDraw.Draw(canvas)
    for i, col in enumerate(((255, 95, 86), (255, 189, 46), (39, 201, 63))):
        cx = x + 26 + i * 30
        d.ellipse((cx - 7, y + 14, cx + 7, y + 28), fill=col + (230,))
    pill_w, pill_h = 250, 26
    px, py = x + (target_w - pill_w) // 2, y + 8
    d.rounded_rectangle((px, py, px + pill_w, py + pill_h), radius=13, fill=(44, 52, 60, 255))
    url = "127.0.0.1:8472"
    tw = d.textlength(url, font=font(FONT_REG, 17))
    d.text((px + pill_w / 2 - tw / 2, py + 4), url, font=font(FONT_REG, 17), fill=(190, 205, 212, 255))
    return y + bar + bh


def wrap(d, text, fnt, max_w):
    words, lines, cur = text.split(), [], ""
    for w_ in words:
        cand = f"{cur} {w_}".strip()
        if d.textlength(cand, font=fnt) <= max_w or not cur:
            cur = cand
        else:
            lines.append(cur)
            cur = w_
    if cur:
        lines.append(cur)
    return lines


def fit_size(d, text, path, size, min_size, max_w):
    while size > min_size and d.textlength(text, font=font(path, size)) > max_w:
        size -= 2
    return size


def pair(canvas, desk_png, phone_png, phone_h=600, desk_w=620):
    """Desktop window right, phone overlapping its lower-left. Returns group left x."""
    desk_x = DEV_R - desk_w
    browser_mock(canvas, desk_png, desk_x, desk_w)
    px, _fw = phone_mock(canvas, phone_png, DEV_L, phone_h)
    return px


def card(name, kicker, headline, sub, desk_png, phone_png, phone_h=600, desk_w=620):
    canvas = gradient().convert("RGBA")
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle([96, 128, 106, 178], radius=5, fill=ACCENT)
    d.text((124, 128), " ".join(kicker.upper()), font=font(FONT_BOLD, 24), fill=ACCENT)

    y = 178
    h_size = fit_size(d, headline, FONT_BOLD, 60, 38, TEXT_R - 124)
    d.text((124, y), headline, font=font(FONT_BOLD, h_size), fill=INK)
    y += h_size + 26

    sf = font(FONT_REG, 28)
    for line in wrap(d, sub, sf, TEXT_R - 124):
        d.text((126, y), line, font=sf, fill=MUTED)
        y += 40

    foot = "sudo snap install lienka"
    fw_ = d.textlength(foot, font=font(FONT_REG, 24))
    d.rounded_rectangle((126, 788, 126 + fw_ + 56, 836), radius=24, outline=ACCENT + (140,), width=2)
    d.text((154, 800), foot, font=font(FONT_REG, 24), fill=ACCENT)

    group_l = pair(canvas, desk_png, phone_png, phone_h=phone_h, desk_w=desk_w)

    # zone guard
    max_text = max(d.textlength(t, font=font(FONT_BOLD, h_size)) + 124 for t in [headline])
    if max_text > TEXT_R or group_l < DEV_L:
        print(f"  !! {name}: text reaches {max_text:.0f}, devices start {group_l}", file=sys.stderr)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name)
    canvas.convert("RGB").save(path)
    print(path)


def S(tag, scen, dev):
    return os.path.join("screenshots", f"2026-10-24-{tag}-{scen}-{dev}.png")


# 1 — hero: brand block + today on desktop with live sleep timer + phone twin
c = gradient().convert("RGBA")
d = ImageDraw.Draw(c)
d.text((110, 200), "Lienka", font=font(FONT_BOLD, 140), fill=INK)
d.text((118, 378), "self-hosted baby log", font=font(FONT_REG, 44), fill=ACCENT)
for i, b in enumerate([
    "feeds · sleep · nappies · meds",
    "live timers, one-tap logging",
    "LAN-shared — zero accounts",
    "charts with WHO weight bands",
    "insights that cite their sources",
]):
    y = 468 + i * 56
    d.ellipse((120, y + 14, 134, y + 28), fill=ACCENT)
    d.text((156, y), b, font=font(FONT_REG, 30), fill=MUTED)
browser_mock(c, S("storeB", "today", "desktop"), 890, 654, y=90)
phone_mock(c, S("storeA", "statssleep", "iphone15pm"), DEV_L, 620)
os.makedirs(OUT, exist_ok=True)
c.convert("RGB").save(os.path.join(OUT, "Lienka-1-hero.png"))
print(os.path.join(OUT, "Lienka-1-hero.png"))

card("Lienka-2-today.png", "Today",
     "Timers that just run",
     "Start a feed per side or method, sleep, walk or bath — the running card sits on top and counts live.",
     S("storeB", "today", "desktop"), S("storeA", "today", "iphone15pm"))

card("Lienka-3-log.png", "Shared log",
     "One log, every carer",
     "Day-grouped entries with user and kind filters — add, edit or undo from any phone in the house.",
     S("storeB", "log", "desktop"), S("storeA", "log", "iphone15pm"))

card("Lienka-4-charts.png", "Charts",
     "Patterns at a glance",
     "Output, feeds, sleep and care time over 7/14/30 days, plus WHO weight-velocity bands on the scale tab.",
     S("storeB", "statssleep", "desktop"), S("storeA", "statssleep", "iphone15pm"))

card("Lienka-5-insights.png", "Tips",
     "Signals that cite sources",
     "Deterministic checks against WHO, NHS and Slovak references — every threshold on every card shows its source.",
     S("storeB", "insights", "desktop"), S("storeA", "insights", "iphone15pm"))

card("Lienka-6-doctor.png", "Doctor",
     "Ready for the pediatrician",
     "A visit checklist generated from your own records — copy it straight into chat or print it for the appointment.",
     S("storeB", "doctor", "desktop"), S("storeA", "doctor", "iphone15pm"))

card("Lienka-7-desktop.png", "Installable PWA",
     "One app, every screen",
     "Open it in a browser today, add it to the home screen tomorrow. Same view on phone, tablet, desktop — offline shell included.",
     S("storeB", "today", "desktop"), S("storeA", "today", "iphone15pm"), phone_h=540, desk_w=660)

card("Lienka-8-dark.png", "Night mode",
     "Kind at 3 a.m.",
     "Dark theme, Slovak and English, installable PWA — one SQLite file as the whole database, no cloud anywhere.",
     S("storeD", "today", "desktop"), S("storeC", "today", "iphone15pm"))
