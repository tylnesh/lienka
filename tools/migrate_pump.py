#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only

"""One-off migration: pumping stopped being a feed method and became its own entry kind.

Old databases stored pumping as a feeding (kind='feed', feed_method='pump') with the volume in
feed_ml. That conflated two different ledgers — baby's intake vs. the mother's supply — so the
milk bank couldn't be computed honestly. This script reclassifies those rows to kind='pump' with
the volume moved to pump_ml, exactly what the v1.23 server does on startup, and is safe to run
either before or after upgrading the app (it is a no-op once there's nothing left to convert).

The snap keeps its data in /var/snap/lienka/common/data:

    sudo cp /var/snap/lienka/common/data/baby.db baby.db.bak
    python3 tools/migrate_pump.py --db /var/snap/lienka/common/data/baby.db

Dry run first, then go for real:

    python3 tools/migrate_pump.py --db baby.db --dry-run
    python3 tools/migrate_pump.py --db baby.db
"""
import argparse
import sqlite3
import sys


def table_columns(conn: sqlite3.Connection) -> list[str]:
    return [row[1] for row in conn.execute("PRAGMA table_info(entries)")]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--db", required=True, help="path to baby.db (the snap's lives in /var/snap/lienka/common/data)")
    ap.add_argument("--dry-run", action="store_true", help="only report what would change")
    args = ap.parse_args()

    conn = sqlite3.connect(args.db)
    try:
        cols = table_columns(conn)
        if "feed_method" not in cols:
            print("entries table has no feed_method column — is this a baby.db?", file=sys.stderr)
            return 1
        n = conn.execute(
            "SELECT COUNT(*) FROM entries WHERE kind='feed' AND feed_method='pump'"
        ).fetchone()[0]
        if not n:
            print("Nothing to migrate: no feed entries with method 'pump'.")
            return 0
        has_pump_ml = "pump_ml" in cols
        verb = "would move" if args.dry_run else "moved"
        if args.dry_run:
            print(f"{n} pumping entr{'y' if n == 1 else 'ies'} found; {verb} feed_ml -> pump_ml and reclassify to kind='pump'.")
            return 0
        if not has_pump_ml:
            conn.execute("ALTER TABLE entries ADD COLUMN pump_ml INTEGER")
            print("added missing pump_ml column")
        conn.execute(
            "UPDATE entries SET kind='pump', pump_ml=feed_ml, feed_ml=NULL, feed_method=NULL"
            " WHERE kind='feed' AND feed_method='pump'"
        )
        conn.commit()
        left = conn.execute(
            "SELECT COUNT(*) FROM entries WHERE kind='feed' AND feed_method='pump'"
        ).fetchone()[0]
        done = conn.execute("SELECT COUNT(*) FROM entries WHERE kind='pump'").fetchone()[0]
        print(f"{verb} {n - left} entr{'y' if n == 1 else 'ies'}; {done} pumping entries total, {left} left to convert.")
        if left:
            print("some rows could not be converted — check the pump_ml column exists.", file=sys.stderr)
            return 1
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
