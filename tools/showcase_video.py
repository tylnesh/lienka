#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Michal Kohutek
# SPDX-License-Identifier: GPL-3.0-only

"""Assemble the ~40 s full-feature store showcase from recorded clips:
   UI tour (tools/showcase_walk.mjs) -> phone->tablet->desktop scaling
   (tools/responsive_walk.mjs, short takes) -> outro card + PD music bed.

    BASE_URL=http://127.0.0.1:8476 node tools/showcase_walk.mjs
    BASE_URL=http://127.0.0.1:8476 VIDEO_DIR=/tmp/lienka-deviceclips DWELL_FACTOR=0.5 node tools/responsive_walk.mjs
    python3 tools/showcase_video.py

Writes screenshots/store-final/lienka-showcase.mp4. Snap-store motion media is
capped at 40 s, so the assembly prints a warning if that is exceeded.
"""
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
import responsive_video as rv  # bezels, backdrop, outro card, ffmpeg helpers

WORK = "/tmp/lienka-showcase/asm"
TOUR_WEBM_DIR = "/tmp/lienka-showcase/rec"
DEVCLIPS = "/tmp/lienka-deviceclips"
OUT = os.path.join("screenshots", "store-final", "lienka-showcase.mp4")
MUSIC = "/tmp/lienka-music/canon.mp3"  # Pachelbel Canon, USAF Band — PD US Gov work
XFADE = 0.55
OUTRO_S = float(os.environ.get("OUTRO_S", "3.0"))


def encode(src_vf, inputs, dur, out):
    cmd = ["ffmpeg", "-y", "-v", "error"] + inputs + ["-filter_complex", src_vf,
           "-map", "[v]", "-t", f"{dur:.2f}", "-r", "25", "-c:v", "libx264", "-crf", "19",
           "-preset", "medium", "-pix_fmt", "yuv420p", out]
    subprocess.run(cmd, check=True, capture_output=True)


def main():
    os.makedirs(WORK, exist_ok=True)
    rv.bg().convert("RGB").save(os.path.join(WORK, "bg.png"))
    rv.phone_frame().save(os.path.join(WORK, "bezel-phone.png"))
    rv.tablet_frame().save(os.path.join(WORK, "bezel-tablet.png"))
    rv.monitor_frame().save(os.path.join(WORK, "bezel-monitor.png"))
    rv.outro().save(os.path.join(WORK, "outro.png"), quality=92)

    tour = next(iter(sorted(os.listdir(TOUR_WEBM_DIR))), None)
    assert tour and tour.endswith(".webm"), "run showcase_walk.mjs first"
    tour = os.path.join(TOUR_WEBM_DIR, tour)

    segs = []
    seg_tour = os.path.join(WORK, "seg-tour.mp4")
    d = rv.dur_of(tour) - 0.5
    encode(f"[0:v]scale={rv.CW}:{rv.CH},fps=25,setsar=1,format=yuv420p[v]", ["-i", tour], d, seg_tour)
    segs.append((seg_tour, d))

    for name, spec, bezel in [("phone", rv.PHONE, "bezel-phone.png"), ("tablet", rv.TABLET, "bezel-tablet.png"),
                              ("desktop", rv.MONITOR, "bezel-monitor.png")]:
        clip = os.path.join(DEVCLIPS, f"clip-{name}.webm")
        dc = rv.dur_of(clip) - 0.6
        sx, sy = rv.place(spec)
        vf = (f"[1:v]crop={spec['css'][0]}:{spec['css'][1]}:0:0,scale={spec['screen'][0]}:{spec['screen'][1]}"
              f":flags=lanczos,fps=25,setsar=1[c];"
              f"[0:v][c]overlay={sx}:{sy}:shortest=1[o];[o][2:v]overlay=0:0[v]")
        encode(vf, ["-loop", "1", "-i", os.path.join(WORK, "bg.png"),
                    "-stream_loop", "-1", "-i", clip, "-i", os.path.join(WORK, bezel)], dc,
               os.path.join(WORK, f"seg-{name}.mp4"))
        segs.append((os.path.join(WORK, f"seg-{name}.mp4"), dc))

    seg_outro = os.path.join(WORK, "seg-outro.mp4")
    rv.run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-t", str(OUTRO_S), "-i", os.path.join(WORK, "outro.png"),
            "-vf", "fps=25,format=yuv420p", "-c:v", "libx264", "-crf", "19", seg_outro])
    segs.append((seg_outro, OUTRO_S))

    total = sum(s[1] for s in segs) - XFADE * (len(segs) - 1)
    if not os.path.exists(MUSIC):
        raise SystemExit(f"music bed missing: {MUSIC} (see tools/add_music.sh header for the PD source URL)")

    inputs, chain, prev, acc = [], "", "[0:v]", segs[0][1]
    for i in range(1, len(segs)):
        offset = acc - XFADE
        acc += segs[i][1] - XFADE
        lbl = "[xs]"
        chain += f"{prev}[{i}:v]xfade=transition=slideleft:duration={XFADE}:offset={offset:.2f}{lbl};"
        prev = lbl
    chain += (f"[xs]fade=t=in:st=0:d=0.7,fade=t=out:st={total - 0.8:.2f}:d=0.7,format=yuv420p[v];"
              f"[{len(segs)}:a]atrim=0:{total:.2f},afade=t=in:st=0:d=1.3,"
              f"afade=t=out:st={total - 1.7:.2f}:d=1.6,volume=-2.5dB[a]")
    inputs = sum([["-i", p] for p, _ in segs], []) + ["-stream_loop", "-1", "-i", MUSIC]
    subprocess.run(["ffmpeg", "-y", "-v", "error"] + inputs +
                   ["-filter_complex", chain, "-map", "[v]", "-map", "[a]",
                    "-c:v", "libx264", "-crf", "19", "-preset", "medium",
                    "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", OUT], check=True)
    print(f"{OUT}  {total:.1f}s")
    if total > 40.5:
        print("!! over the 40 s snap-store motion media cap — shorten tour dwells (DWELL_FACTOR)", file=sys.stderr)


if __name__ == "__main__":
    main()
