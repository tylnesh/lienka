#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Michal Kohutek
# SPDX-License-Identifier: GPL-3.0-only

"""Assemble the responsive device-mockup video from tools/responsive_walk.mjs clips.

Draws stock-style iPhone/iPad/monitor bezels + brand backdrop with Pillow,
pastes the recorded screen clips inside them via ffmpeg, joins segments with
slide transitions and ends on a still outro card.

    node tools/responsive_walk.mjs            # records clip-{phone,tablet,desktop}.webm
    python3 tools/responsive_video.py         # -> screenshots/store-final/lienka-responsive.mp4
"""
import os
import subprocess

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

WORK = "/tmp/lienka-responsive"
OUT = os.path.join("screenshots", "store-final", "lienka-responsive.mp4")
CW, CH = 1920, 1080
XFADE = 0.6
BG_TOP, BG_BOT = (14, 17, 22), (23, 38, 48)
ACCENT = (58, 166, 140)
INK = (236, 242, 244)
MUTED = (150, 168, 176)
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# device specs: screen size (canvas px), outer frame margin/radius, colours,
# and css = the viewport Playwright actually painted (its recordings letterbox
# the page at CSS size in the top-left of the video frame, so we crop it out)
PHONE = dict(screen=(406, 880), m=17, r=56, frame=(20, 24, 29), css=(430, 932))
TABLET = dict(screen=(601, 800), m=26, r=34, frame=(28, 33, 38), css=(834, 1112))
MONITOR = dict(screen=(1240, 775), m=16, r=8, chin=34, neck=(150, 64), base=(480, 20), frame=(34, 40, 46),
               css=(1440, 900))


def fnt(path, size):
    return ImageFont.truetype(path, size)


def bg():
    g = Image.new("RGB", (1, CH))
    for y in range(CH):
        t = y / CH
        g.putpixel((0, y), tuple(int(a + (b - a) * t) for a, b in zip(BG_TOP, BG_BOT)))
    img = g.resize((CW, CH)).convert("RGBA")
    d = ImageDraw.Draw(img)
    glow = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((CW // 2 - 620, CH - 540, CW // 2 + 620, CH + 260), fill=ACCENT + (26,))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(120)))
    d.text((70, 52), "Lienka", font=fnt(FONT_BOLD, 44), fill=INK + (235,))
    d.text((72, 108), "one view · every screen", font=fnt(FONT_REG, 26), fill=ACCENT + (220,))
    return img


def rounded(img, radius):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius=radius, fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def punch_hole(img, sx, sy, sw, sh, radius):
    """Make the screen area transparent so the pasted clip shows through."""
    mask = Image.new("L", img.size, 255)
    ImageDraw.Draw(mask).rounded_rectangle([sx, sy, sx + sw - 1, sy + sh - 1], radius=radius, fill=0)
    img.putalpha(ImageChops.multiply(img.getchannel("A"), mask))


def shadow(layer, x, y, w, h, r):
    s = Image.new("RGBA", (w + 160, h + 160), (0, 0, 0, 0))
    ImageDraw.Draw(s).rounded_rectangle([80, 96, w + 80, h + 96], radius=r, fill=(0, 0, 0, 150))
    layer.alpha_composite(s.filter(ImageFilter.GaussianBlur(30)), (x - 80, y - 60))


def floor_y():
    return CH - 96


def place(dev):
    """Screen top-left so the device bottom (incl. stand) rests on the floor line."""
    sw, sh = dev["screen"]
    extra = dev.get("chin", 0) + (dev.get("neck", (0, 0))[1] + dev.get("base", (0, 0))[1] if "neck" in dev else 0)
    total_h = dev["m"] + sh + dev["m"] + extra
    x = (CW - (sw + 2 * dev["m"])) // 2
    y = floor_y() - total_h
    return x + dev["m"], y + dev["m"]  # screen origin


def phone_frame():
    sw, sh = PHONE["screen"]
    fw, fh = sw + 2 * PHONE["m"], sh + 2 * PHONE["m"]
    img = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    sx, sy = place(PHONE)
    shadow(img, sx - PHONE["m"], sy - PHONE["m"], fw, fh, PHONE["r"])
    img.alpha_composite(rounded(Image.new("RGBA", (fw, fh), PHONE["frame"] + (255,)), PHONE["r"]),
                        (sx - PHONE["m"], sy - PHONE["m"]))
    punch_hole(img, sx, sy, sw, sh, 40)
    d = ImageDraw.Draw(img)  # dynamic-island pill on top of the screen area
    iw, ih = 116, 30
    ix, iy = sx + (sw - iw) // 2, sy + 14
    d.rounded_rectangle((ix, iy, ix + iw, iy + ih), radius=ih // 2, fill=(6, 8, 10, 255))
    return img


def tablet_frame():
    sw, sh = TABLET["screen"]
    fw, fh = sw + 2 * TABLET["m"], sh + 2 * TABLET["m"]
    img = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    sx, sy = place(TABLET)
    shadow(img, sx - TABLET["m"], sy - TABLET["m"], fw, fh, TABLET["r"])
    img.alpha_composite(rounded(Image.new("RGBA", (fw, fh), TABLET["frame"] + (255,)), TABLET["r"]),
                        (sx - TABLET["m"], sy - TABLET["m"]))
    punch_hole(img, sx, sy, sw, sh, 20)
    cx, cy = sx + sw // 2, sy - TABLET["m"] // 2 - 2
    ImageDraw.Draw(img).ellipse((cx - 5, cy - 5, cx + 5, cy + 5), fill=(90, 104, 116, 255))  # camera dot in bezel
    return img


def monitor_frame():
    sw, sh = MONITOR["screen"]
    m, chin = MONITOR["m"], MONITOR["chin"]
    body_w, body_h = sw + 2 * m, sh + 2 * m + chin
    nw, nh = MONITOR["neck"]
    bw, bh = MONITOR["base"]
    img = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    sx, sy = place(MONITOR)
    bx, by = sx - m, sy - m
    shadow(img, bx, by, body_w, body_h + nh + bh, 10)
    d = ImageDraw.Draw(img)
    cx = CW // 2
    d.rectangle((cx - nw // 2, by + body_h, cx + nw // 2, by + body_h + nh), fill=MONITOR["frame"] + (255,))
    img.alpha_composite(rounded(Image.new("RGBA", (bw, bh), MONITOR["frame"] + (255,)), bh // 2),
                        (cx - bw // 2, by + body_h + nh - 4))
    img.alpha_composite(rounded(Image.new("RGBA", (body_w, body_h), MONITOR["frame"] + (255,)), MONITOR["r"]), (bx, by))
    punch_hole(img, sx, sy, sw, sh, 4)
    d.text((cx, by + sh + m + chin // 2 - 11), "L I E N K A", font=fnt(FONT_REG, 16), fill=(120, 136, 146, 255))
    return img


def outro():
    img = bg()
    d = ImageDraw.Draw(img)
    d.text((CW // 2, 396), "Lienka", font=fnt(FONT_BOLD, 170), fill=INK, anchor="mm")
    d.text((CW // 2, 560), "phone · tablet · desktop — one installable PWA", font=fnt(FONT_REG, 46),
           fill=ACCENT, anchor="mm")
    sub = "self-hosted · no cloud · one SQLite file"
    d.text((CW // 2, 636), sub, font=fnt(FONT_REG, 30), fill=MUTED, anchor="mm")
    foot = "sudo snap install lienka"
    tw = d.textlength(foot, font=fnt(FONT_REG, 34))
    d.rounded_rectangle((CW // 2 - tw / 2 - 40, 760, CW // 2 + tw / 2 + 40, 836), radius=38,
                        outline=ACCENT + (150,), width=3)
    d.text((CW // 2, 798), foot, font=fnt(FONT_REG, 34), fill=ACCENT, anchor="mm")
    return img.convert("RGB")


def dur_of(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def run(cmd):
    print(" ".join(cmd[:6]), "...")
    subprocess.run(cmd, check=True, capture_output=True)


def encode_segment(clip, bezel, screen_xy, screen_wh, css_wh, out, total_dur):
    bg_png = os.path.join(WORK, "bg.png")
    cmd = ["ffmpeg", "-y", "-v", "error", "-loop", "1", "-i", bg_png, "-stream_loop", "-1", "-i", clip,
           "-i", bezel,
           "-filter_complex",
           f"[1:v]crop={css_wh[0]}:{css_wh[1]}:0:0,scale={screen_wh[0]}:{screen_wh[1]}:flags=lanczos,"
           f"fps=25,setsar=1[c];"
           f"[0:v][c]overlay={screen_xy[0]}:{screen_xy[1]}:shortest=1[o];"
           f"[o][2:v]overlay=0:0[v]",
           "-map", "[v]", "-t", f"{total_dur:.2f}", "-r", "25",
           "-c:v", "libx264", "-crf", "19", "-preset", "medium", "-pix_fmt", "yuv420p", out]
    run(cmd)


def main():
    os.makedirs(WORK, exist_ok=True)
    bg().convert("RGB").save(os.path.join(WORK, "bg.png"))
    phone_frame().save(os.path.join(WORK, "bezel-phone.png"))
    tablet_frame().save(os.path.join(WORK, "bezel-tablet.png"))
    monitor_frame().save(os.path.join(WORK, "bezel-monitor.png"))
    outro().save(os.path.join(WORK, "outro.png"), quality=92)

    segs = []
    for name, spec, bezel in [("phone", PHONE, "bezel-phone.png"), ("tablet", TABLET, "bezel-tablet.png"),
                              ("desktop", MONITOR, "bezel-monitor.png")]:
        clip = os.path.join(WORK, f"clip-{name}.webm")
        d = dur_of(clip) - 1.0  # drop the settle/scroll tail jitter, keep ~3-5 s of hero shot
        sx, sy = place(spec)
        encode_segment(clip, os.path.join(WORK, bezel), (sx, sy), spec["screen"], spec["css"],
                       os.path.join(WORK, f"seg-{name}.mp4"), d)
        segs.append((os.path.join(WORK, f"seg-{name}.mp4"), d))

    outro_seg = os.path.join(WORK, "seg-outro.mp4")
    run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-t", "3.6", "-i", os.path.join(WORK, "outro.png"),
         "-vf", "fps=25,format=yuv420p", "-c:v", "libx264", "-crf", "19", outro_seg])
    segs.append((outro_seg, 3.6))

    # xfade chain
    inputs, chain = [], ""
    for p, _ in segs:
        inputs += ["-i", p]
    prev = "[0:v]"
    offset = 0.0
    total = segs[0][1]
    for i in range(1, len(segs)):
        offset = total - XFADE
        total = total + segs[i][1] - XFADE
        out = "[x]" if i < len(segs) - 1 else "[xs]"
        chain += f"{prev}[{i}:v]xfade=transition=slideleft:duration={XFADE}:offset={offset:.2f}{out};"
        prev = out
    fade_out = total - 0.8
    chain += (f"[xs]fade=t=in:st=0:d=0.7,fade=t=out:st={fade_out:.2f}:d=0.8,"
              f"format=yuv420p[v]")
    run(["ffmpeg", "-y", "-v", "error"] + inputs +
        ["-filter_complex", chain, "-map", "[v]", "-c:v", "libx264", "-crf", "19", "-preset", "medium",
         "-movflags", "+faststart", OUT])
    print(OUT, f"{total:.1f}s")


if __name__ == "__main__":
    main()
