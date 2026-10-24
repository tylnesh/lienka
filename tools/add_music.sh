#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Michal Kohutek
# SPDX-License-Identifier: GPL-3.0-only
# Add a public-domain classical music bed to the store demo videos.
#
# Music: Pachelbel's Canon in D — "Strolling Strings", United States Air Force
# Band (2004). U.S. Government work -> public domain worldwide, no attribution
# required. Source: Wikimedia Commons file page
# https://commons.wikimedia.org/wiki/File:Canon_(2004)_-_Strolling_Strings_-_United_States_Air_Force_Band.mp3
#
# Run from the repo root with ffmpeg installed. Silent originals are expected
# at screenshots/store-final/*.mp4 (see tools/walkthrough.mjs,
# tools/responsive_video.py); they are backed up to /tmp/lienka-music first.
set -euo pipefail

WORK=/tmp/lienka-music
SRC_URL="https://commons.wikimedia.org/wiki/Special:FilePath/Canon%20(2004)%20-%20Strolling%20Strings%20-%20United%20States%20Air%20Force%20Band.mp3"
VID=screenshots/store-final

mkdir -p "$WORK"
[ -f "$WORK/canon.mp3" ] || curl -sL --retry 2 -A "lienka-demo-video/1.0" -o "$WORK/canon.mp3" "$SRC_URL"
cp -n "$VID"/lienka-walkthrough.mp4 "$VID"/lienka-responsive.mp4 "$WORK/" 2>/dev/null || true

mix() { # mix <in.mp4> <out.mp4> <dur> <fadeout_start> <fadeout_dur> <fadein>
  ffmpeg -y -v error -i "$1" -i "$WORK/canon.mp3" -filter_complex \
    "[1:a]atrim=0:$3,afade=t=in:st=0:d:$6,afade=t=out:st=$4:d=$5,volume=-2.5dB[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -movflags +faststart "$2"
  mv "$2" "$1"; echo "music added: $1"
}

# durations must match the video lengths (see tools/responsive_video.py / walkthrough run logs)
mix "$VID/lienka-walkthrough.mp4" "$WORK/wt.tmp.mp4" 29.50 27.90 1.55 1.6
mix "$VID/lienka-responsive.mp4"  "$WORK/rs.tmp.mp4" 18.44 16.90 1.50 1.2
