#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Michal Kohutek
# SPDX-License-Identifier: GPL-3.0-only

"""Re-import entries from a baby-log CSV export (the /export.csv format) into a baby.db.

The regular restore path is the SQLite backup deploy.sh keeps; this tool is for when only a
CSV export survived (lost disk, new instance). It writes straight into the database — start
the target server once so the schema exists, then STOP it before importing.

    python3 tools/import_csv.py --db ./data/baby.db --csv baby-log.csv [--dry-run]

Into an EMPTY entries table rows are restored verbatim: original ids, created/updated stamps
and source_pump_id links are preserved. Into a NON-empty database pass --append; new ids are
assigned and bottle→bag links are remapped to the freshly inserted pump sessions.

Limitations (by design, so nothing is silently lost): photos attached to entries are not in
the CSV export, and task definitions / check-ins are not part of this format — entries only.
"""
import argparse
import csv
import sqlite3
import sys

# entry columns that must stay NULL when the CSV cell is empty; everything else empty = NULL too
MUST_BE_NULL = {c for c in (
    "diaper_type", "diaper_colour", "feed_method", "feed_minutes", "feed_ml", "swallows", "end_at",
    "pump_ml", "pump_side", "fed_ml", "source_pump_id", "expires_on",
    "measure_kind", "value", "med_name", "dose", "activity", "task_id",
    "scale_before_g", "scale_after_g", "photo_a", "photo_b", "updated", "note", "timer",
)}


def metrics(conn, where=""):
    rows = conn.execute(f"SELECT kind, COUNT(*) c FROM entries {where} GROUP BY kind").fetchall()
    return dict(rows)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--db", required=True, help="target baby.db (server must be stopped)")
    ap.add_argument("--csv", required=True, help="CSV file from /export.csv")
    ap.add_argument("--append", action="store_true", help="import into a database that already has entries (new ids)")
    ap.add_argument("--dry-run", action="store_true", help="validate and report, change nothing")
    args = ap.parse_args()

    with open(args.csv, newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        header = reader.fieldnames or []
        if not {"id", "user", "kind", "at"}.issubset(set(header)):
            print("CSV lacks the id,user,kind,at columns — is this a /export.csv file?", file=sys.stderr)
            return 1
        rows = list(reader)
    if not rows:
        print("CSV has no data rows; nothing to do.")
        return 0

    conn = sqlite3.connect(args.db, timeout=2)
    try:
        conn.execute("BEGIN IMMEDIATE")  # fail fast when a running server holds the db
    except sqlite3.OperationalError:
        print("database is locked — stop the app's server first (the import must run offline)", file=sys.stderr)
        return 1
    try:
        cols = {r[1] for r in conn.execute("PRAGMA table_info(entries)")}
        unknown = [c for c in header if c not in cols and c != ""]
        if unknown:
            print(f"CSV columns missing from this database's schema: {unknown} — update the app first", file=sys.stderr)
            return 1
        existing = conn.execute("SELECT COUNT(*) FROM entries").fetchone()[0]
        keep_ids = existing == 0 or not rows[0].get("id")
        if existing and not args.append and any(r.get("id") for r in rows):
            print(f"target already holds {existing} entries — refusing to collide; pass --append to import with new ids",
                  file=sys.stderr)
            return 1

        columns = [c for c in header if c in cols and c != ""]
        insert_cols = [c for c in columns if keep_ids or c not in ("id", "source_pump_id")]
        sql = f"INSERT INTO entries({','.join(insert_cols)}) VALUES({','.join('?' * len(insert_cols))})"
        id_map, pending_links, inserted, skipped = {}, [], 0, []
        for i, r in enumerate(rows, start=2):  # start=2: header is line 1
            if not (r.get("kind") or "").strip() or not (r.get("at") or "").strip():
                skipped.append(i)
                continue
            payload = [None if (r.get(c) is None or r[c] == "") else r[c] for c in insert_cols]
            cur = conn.execute(sql, payload)
            inserted += 1
            if keep_ids:
                continue
            try:
                old_id = int(r["id"]) if r.get("id") else None
            except ValueError:
                old_id = None
            if old_id is not None:
                id_map[old_id] = cur.lastrowid
            if r.get("source_pump_id"):
                pending_links.append((cur.lastrowid, r["source_pump_id"]))
        linked = 0
        for new_row, old_src in pending_links:
            try:
                mapped = id_map.get(int(old_src))
            except ValueError:
                mapped = None
            if mapped is not None:
                conn.execute("UPDATE entries SET source_pump_id=? WHERE id=?", (mapped, new_row))
                linked += 1
        kinds = metrics(conn)
        if args.dry_run:
            conn.rollback()
            print(f"dry run: {inserted} rows would be inserted ({len(skipped)} skipped at lines {skipped[:5]}), "
                  f"target untouched. Existing kinds after rollback remain: {kinds}")
            return 0
        conn.commit()
        total = conn.execute("SELECT COUNT(*) FROM entries").fetchone()[0]
        print(f"imported {inserted} rows ({'ids preserved' if keep_ids else f'new ids, {linked} bottle links remapped'}); "
              f"db now holds {total} entries; skipped {len(skipped)} incomplete rows"
              + (f" at lines {skipped[:10]}" if skipped else "") + ".")
        print("kinds:", ", ".join(f"{k}={c}" for k, c in sorted(kinds.items())))
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
