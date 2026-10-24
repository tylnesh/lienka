#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Michal Kohutek
# SPDX-License-Identifier: GPL-3.0-only

"""Compose Snap Store screenshot cards (uniform 1600x900) from shot.mjs PNGs.

    python3 tools/store_shots.py screenshots/2026-10-24-storeA-today-iphone15pm.png ...

Reads the day's store{A,B,C} shots from ./screenshots, writes finished cards
to ./screenshots/store-final/. Deterministic; needs Pillow.
"""
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join("screenshots", "store-final")
W, H = 1600, 900
BG_TOP, BG_BOT = (14, 17, 22), (23, 38, 48)          # brand #0e1116 -> deep teal haze
ACCENT = (58, 166, 140)                              # lienka teal (icon green)
INK = (236, 242, 244)
MUTED = (150, 168, 176)
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


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


def phone_mock(canvas, img_path, cx, target_h):
    """Draw `img_path` as a rounded dark-bezel phone centred on cx, vertically centred."""
    src = Image.open(img_path)
    sw, sh = src.size
    iw = int(target_h * sw / sh)
    screen = src.convert("RGBA").resize((iw, target_h), Image.LANCZOS)
    bezel, frame = 16, 10
    fw, fh = iw + 2 * (bezel + frame), target_h + 2 * (bezel + frame)
    x, y = int(cx - fw / 2), int((H - fh) / 2) + 30
    # soft shadow
    sh_img = Image.new("RGBA", (fw + 60, fh + 60), (0, 0, 0, 0))
    ImageDraw.Draw(sh_img).rounded_rectangle([30, 40, fw + 30, fh + 30], radius=56, fill=(0, 0, 0, 130))
    sh_img = sh_img.filter(ImageFilter.GaussianBlur(18))
    canvas.alpha_composite(sh_img, (x - 30, y - 20))
    # frame + bezel
    outer = Image.new("RGBA", (fw, fh), (18, 22, 26, 255))
    canvas.alpha_composite(rounded(outer, 52), (x, y))
    inner = Image.new("RGBA", (iw + 2 * bezel, target_h + 2 * bezel), (8, 10, 12, 255))
    canvas.alpha_composite(rounded(inner, 40), (x + frame, y + frame))
    canvas.alpha_composite(rounded(screen, 26), (x + frame + bezel, y + frame + bezel))
    return x, y, fw, fh


def laptop_mock(canvas, img_path, crop_h, target_w):
    src = Image.open(img_path).convert("RGB").crop((0, 0, 1440, crop_h))
    tw = target_w
    th = int(crop_h * tw / 1440)
    screen = src.resize((tw, th), Image.LANCZOS)
    x, y = int((W - tw) / 2), int((H - th) / 2) + 6
    sh_img = Image.new("RGBA", (tw + 60, th + 60), (0, 0, 0, 0))
    ImageDraw.Draw(sh_img).rounded_rectangle([30, 40, tw + 30, th + 30], radius=18, fill=(0, 0, 0, 120))
    canvas.alpha_composite(sh_img.filter(ImageFilter.GaussianBlur(16)), (x - 30, y - 20))
    canvas.alpha_composite(rounded(screen, 14), (x, y))
    ImageDraw.Draw(canvas).rounded_rectangle([x - 26, y + th, x + tw + 26, y + th + 18], radius=9, fill=(30, 36, 42, 255))


def header(canvas, title, sub):
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle([80, 70, 92, 150], radius=6, fill=ACCENT)
    d.text((120, 58), title, font=font(FONT_BOLD, 62), fill=INK)
    d.text((122, 140), sub, font=font(FONT_REG, 30), fill=MUTED)


def card(name, title, sub, draw_fn):
    canvas = gradient().convert("RGBA")
    header(canvas, title, sub)
    draw_fn(canvas)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name)
    canvas.convert("RGB").save(path)
    print(path)


def S(tag, scen, dev):
    return os.path.join("screenshots", f"2026-10-24-{tag}-{scen}-{dev}.png")


# 1 — hero: title block + device trio (today / charts / insights)
c = gradient().convert("RGBA")
d = ImageDraw.Draw(c)
d.text((110, 210), "Lienka", font=font(FONT_BOLD, 150), fill=INK)
d.text((118, 390), "self-hosted baby log", font=font(FONT_REG, 46), fill=ACCENT)
bullets = [
    "feeds · sleep · nappies · meds",
    "live timers, one-tap logging",
    "shared on your LAN — no accounts",
    "charts with WHO weight bands",
    "insights that cite their sources",
]
for i, b in enumerate(bullets):
    y = 490 + i * 58
    d.ellipse((120, y + 16, 134, y + 30), fill=ACCENT)
    d.text((156, y), b, font=font(FONT_REG, 32), fill=MUTED)
phone_mock(c, S("storeA", "today", "iphone15pm"), 900, 720)
phone_mock(c, S("storeA", "statssleep", "iphone15pm"), 1140, 720)
phone_mock(c, S("storeA", "insights", "iphone15pm"), 1380, 720)
os.makedirs(OUT, exist_ok=True)
c.convert("RGB").save(os.path.join(OUT, "Lienka-1-hero.png"))
print(os.path.join(OUT, "Lienka-1-hero.png"))

card("Lienka-2-today.png", "Timers that just run",
     "Start a feed per side or method, sleep, walk, bath — the running card lives on top.",
     lambda cv: phone_mock(cv, S("storeA", "today", "iphone15pm"), 800, 700))
card("Lienka-3-log.png", "One log, every carer",
     "Day-grouped entries with user + kind filters — edit and undo from any phone.",
     lambda cv: phone_mock(cv, S("storeA", "log", "iphone15pm"), 800, 700))
card("Lienka-4-charts.png", "Patterns at a glance",
     "Output, feeds, sleep, care time and WHO weight-velocity bands over 7/14/30 days.",
     lambda cv: phone_mock(cv, S("storeA", "statssleep", "iphone15pm"), 800, 700))
card("Lienka-5-insights.png", "Signals that cite sources",
     "Deterministic checks against WHO/NHS/SK references — every threshold shows its source.",
     lambda cv: phone_mock(cv, S("storeA", "insights", "iphone15pm"), 800, 700))
card("Lienka-6-doctor.png", "Ready for the pediatrician",
     "A visit checklist generated from your own records — copy it straight into chat.",
     lambda cv: phone_mock(cv, S("storeA", "doctor", "iphone15pm"), 800, 700))
card("Lienka-7-desktop.png", "Also lovely on desktop and tablets",
     "The same PWA, responsive down to a 4-inch phone — installable everywhere.",
     lambda cv: laptop_mock(cv, S("storeB", "statsweight", "desktop"), 624, 1240))
card("Lienka-8-dark.png", "Kind at 3 a.m.",
     "Dark theme, Slovak + English, offline shell — add to home screen and go.",
     lambda cv: phone_mock(cv, S("storeC", "today", "iphone15pm"), 800, 700))
