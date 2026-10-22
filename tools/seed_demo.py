#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Michal Kohutek
# SPDX-License-Identifier: GPL-3.0-only

"""Fill a baby.db with ~9 realistic newborn days for UI work / screenshots.

    DATA_DIR=/tmp/baby-test python3 tools/seed_demo.py [--open-timer]

Refuses to touch a database that already has entries unless --force is given.
"""
import argparse
import os
import random
import sqlite3
from datetime import datetime, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.abspath(os.environ.get("DATA_DIR", os.path.join(HERE, "..")))
DB = os.path.join(DATA, "baby.db")
BIRTH = os.environ.get("BIRTH_DATE") or (datetime.now().date() - timedelta(days=9)).isoformat()
USERS = [u.strip() for u in os.environ.get("USERS", "parent1,parent2,others").split(",") if u.strip()] or ["parent1", "parent2", "others"]
U0, U1, UL = USERS[0], USERS[min(1, len(USERS) - 1)], USERS[-1]

COLOURS = ["black", "green", "mustard", "yellow", "brown"]


def stamp(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="insert even if entries already exist")
    ap.add_argument("--open-timer", action="store_true", help="leave one sleep running (for timer UI shots)")
    args = ap.parse_args()

    random.seed(7)
    os.makedirs(DATA, exist_ok=True)
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    cols = [r[1] for r in conn.execute("PRAGMA table_info(entries)")]
    if not cols:
        raise SystemExit(f"no entries table in {DB} — start server.py once first")
    existing = conn.execute("SELECT COUNT(*) c FROM entries").fetchone()["c"]
    if existing and not args.force:
        raise SystemExit(f"{DB} already has {existing} entries; pass --force to append anyway")

    today = datetime.now().replace(second=0, microsecond=0)
    birth = datetime.fromisoformat(BIRTH)
    rows = []

    def add(dt, kind, user=None, created=None, **extra):
        rec = {"user": user or U0, "kind": kind, "at": stamp(dt),
               "created": stamp(created or dt)}
        rec.update(extra)
        rows.append(rec)

    day_count = (today.date() - birth.date()).days + 1
    for offset in range(day_count):
        day = (birth + timedelta(days=offset)).date()
        d = datetime.combine(day, datetime.min.time())
        weight = 3400 + offset * 22 + random.randint(-15, 20)
        if offset in (0, 2, 4, 6, 8):
            add(d + timedelta(hours=9, minutes=random.randint(0, 40)), "measure", U1,
                measure_kind="weight_g", value=weight)
        # vitamin D once a day
        add(d + timedelta(hours=10, minutes=random.randint(0, 30)), "measure", U0,
            measure_kind="vitd_iu", value=400)

        clock = d + timedelta(hours=7, minutes=random.randint(0, 50))
        while clock.date() == day and clock < today - timedelta(minutes=25):
            # diaper
            wet = random.choices([1, 2], weights=[80, 20])[0]
            for _ in range(wet):
                colour = COLOURS[min(4, max(0, offset // 2 + random.randint(-1, 1)))]
                dtype = "wet"
                if random.random() < 0.35:
                    dtype = random.choice(["dirty", "mixed"])
                add(clock, "diaper", random.choice(USERS),
                    diaper_type=dtype, diaper_colour=colour if dtype != "wet" else None)
                clock += timedelta(minutes=random.randint(3, 12))
            # feed
            method = random.choices(["breast_left", "breast_right"], weights=[48, 52])[0]
            minutes = random.randint(9, 26)
            end = clock + timedelta(minutes=minutes)
            extra = {"feed_method": method, "end_at": stamp(end), "timer": 1}
            if random.random() < 0.18:
                extra = {"feed_method": random.choice(["bottle_expressed", "bottle_formula"]),
                         "feed_ml": random.randint(25, 70), "feed_minutes": random.randint(8, 15)}
                end = clock + timedelta(minutes=extra["feed_minutes"])
            if random.random() < 0.3:
                extra["swallows"] = random.randint(6, 30)
            add(clock, "feed", U0, **extra)
            clock = end
            # nap
            if random.random() < 0.85:
                nap = random.choice([random.randint(25, 55), random.randint(60, 130)])
                nap_end = min(clock + timedelta(minutes=nap), datetime.combine(day, datetime.max.time()))
                add(clock, "sleep", random.choice((U0, U1)), end_at=stamp(nap_end))
                clock = nap_end + timedelta(minutes=random.randint(5, 20))
            # evening extras
            if clock.hour == 17 and random.random() < 0.7:
                walk_end = clock + timedelta(minutes=random.randint(35, 75))
                add(clock, "walk", U1, timer=1, end_at=stamp(walk_end))
                clock = walk_end + timedelta(minutes=20)
            if clock.hour == 19 and random.random() < 0.9:
                bath_end = clock + timedelta(minutes=random.randint(8, 14))
                add(clock, "bath", U0, timer=1, end_at=stamp(bath_end))
                clock = bath_end + timedelta(minutes=25)
            if offset == 3 and clock.hour >= 12:
                add(clock, "activity", UL, activity="kojení poradna / laktačka",
                    end_at=stamp(clock + timedelta(minutes=60)))
                clock += timedelta(minutes=70)
            if offset == 5 and clock.hour >= 11:
                add(clock, "medication", U0, med_name="Paralen cap.", dose="60 mg čípek")
                add(clock + timedelta(minutes=2), "note", U0,
                    note="Teplota 37,4 °C, jinak v pohodě. Dle laktačky správný úchop.")
            if offset == 7 and clock.hour >= 10:
                add(clock, "measure", U1, measure_kind="temp_c", value=36.8)

    if args.open_timer:
        started = today - timedelta(minutes=random.randint(25, 70))
        add(started, "sleep", U1, timer=1)

    columns = sorted({k for r in rows for k in r})
    sql = "INSERT INTO entries(%s) VALUES(%s)" % (",".join(columns), ",".join("?" * len(columns)))
    for r in rows:
        conn.execute(sql, [r.get(c) for c in columns])
    conn.commit()
    print(f"inserted {len(rows)} entries into {DB}")


if __name__ == "__main__":
    main()
