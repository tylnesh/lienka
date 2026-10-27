#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Michal Kohutek
# SPDX-License-Identifier: GPL-3.0-only

"""Release gate — proves the candidate code in this checkout can carry real data unharmed.

Run it BEFORE deploying or packaging a release, always against a copy of a live database
(deploy.sh does this automatically with the backup it just pulled):

    python3 tools/gate_release.py --db backups/backup-20261027-120534.db
    python3 tools/gate_release.py --db /var/snap/lienka/common/data/baby.db   # read-only: it copies

What it does, all on throwaway copies (the given database is never written):
  1. RESTORE   copy the db into a scratch DATA_DIR, boot this checkout's server.py, expect healthz.
  2. MIGRATE   compare pre/post startup metrics; only expected migrations may change rows
               (v1.23: feed rows with method 'pump' reclassify to kind 'pump').
  3. EXPORT    GET /export.csv, verify header, row count and ml sums against the database.
  4. IMPORT    boot a second scratch instance (empty schema), stop it, replay the exported CSV
               through tools/import_csv.py, boot again — metrics must match the original exactly.

Exit code 0 means: your data survives backup -> restore -> export -> import with these files.
"""
import argparse
import csv
import http.client
import io
import os
import shutil
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
SERVER = os.path.join(HERE, "..", "server.py")
IMPORTER = os.path.join(HERE, "import_csv.py")


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class Instance:
    """A scratch server on its own DATA_DIR — always plain HTTP (no CERT)."""

    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.port = free_port()
        self.proc = None

    def start(self):
        env = dict(os.environ, DATA_DIR=self.data_dir, PORT=str(self.port), HTTP_PORT="0")
        env.pop("CERT", None)
        env.pop("KEY", None)
        log = open(os.path.join(self.data_dir, "server.log"), "wb")
        self.proc = subprocess.Popen([sys.executable, SERVER], env=env, stdout=log, stderr=subprocess.STDOUT)
        for _ in range(80):  # up to ~8s
            time.sleep(0.1)
            try:
                body = self.get("/healthz")
                if '"ok": true' in body or '"ok":true' in body:
                    return
            except OSError:
                pass
        raise RuntimeError(f"server on :{self.port} never became healthy —\n" +
                           open(os.path.join(self.data_dir, "server.log"), "r", errors="replace").read())

    def stop(self):
        if self.proc:
            self.proc.terminate()
            self.proc.wait(timeout=10)
            self.proc = None

    def get(self, path) -> str:
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        try:
            conn.request("GET", path)
            res = conn.getresponse()
            body = res.read().decode("utf-8")
            if res.status >= 400:
                raise RuntimeError(f"GET {path} -> HTTP {res.status}: {body[:200]}")
            return body
        finally:
            conn.close()


def sql_metrics(db_file: str) -> dict:
    """Migration-tolerant aggregates, working even on databases from older versions (columns
    that this release adds may not exist yet — that is the upgrade path we are testing).
    'pump' counts feed rows the old way too (method=pump), and ml totals merge feed_ml+pump_ml
    into one bucket so moving volumes between those columns cannot look like data loss."""
    with sqlite3.connect(f"file:{db_file}?mode=ro", uri=True) as conn:
        cols = {r[1] for r in conn.execute("PRAGMA table_info(entries)")}
        total = conn.execute("SELECT COUNT(*) FROM entries").fetchone()[0]
        by_class = {}
        for kind, method, c in conn.execute(
                "SELECT kind, feed_method, COUNT(*) FROM entries GROUP BY kind, feed_method"):
            cls = "pump" if (kind == "pump" or method == "pump") else kind
            by_class[cls] = by_class.get(cls, 0) + c
        ml = 0
        for col in ("feed_ml", "pump_ml"):
            if col in cols:
                ml += conn.execute(
                    f"SELECT COALESCE(SUM({col}),0) FROM entries"
                    " WHERE kind IN ('feed','pump') OR feed_method='pump'").fetchone()[0]
        first_at = conn.execute("SELECT MIN(at) FROM entries").fetchone()[0]
        last_at = conn.execute("SELECT MAX(at) FROM entries").fetchone()[0]
    return {"total": total, "classes": by_class, "ml": ml, "first_at": first_at, "last_at": last_at}


def api_metrics(inst: Instance) -> dict:
    import json
    rows = json.loads(inst.get("/api/entries?limit=5000"))["entries"]
    by_class, ml, total = {}, 0, len(rows)
    first_at = min((r["at"] for r in rows), default=None)
    last_at = max((r["at"] for r in rows), default=None)
    for r in rows:
        cls = "pump" if (r["kind"] == "pump" or r.get("feed_method") == "pump") else r["kind"]
        by_class[cls] = by_class.get(cls, 0) + 1
        if r["kind"] in ("feed", "pump") or r.get("feed_method") == "pump":
            ml += (r.get("feed_ml") or 0) + (r.get("pump_ml") or 0)
    return {"total": total, "classes": by_class, "ml": ml, "first_at": first_at, "last_at": last_at}


def compare(label: str, before: dict, after: dict) -> bool:
    ok = True
    if before["total"] != after["total"]:
        print(f"FAIL {label}: row count {before['total']} -> {after['total']}"); ok = False
    if before["classes"] != after["classes"]:
        print(f"FAIL {label}: kind counts changed: {before['classes']} -> {after['classes']}"); ok = False
    if before["ml"] != after["ml"]:
        print(f"FAIL {label}: total ml {before['ml']} -> {after['ml']}"); ok = False
    if (before["first_at"], before["last_at"]) != (after["first_at"], after["last_at"]):
        print(f"FAIL {label}: time span changed {before['first_at']}..{before['last_at']} -> "
              f"{after['first_at']}..{after['last_at']}"); ok = False
    if ok:
        print(f"PASS {label}: {after['total']} rows, ml={after['ml']}, span {after['first_at']}..{after['last_at']}")
    return ok


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--db", required=True, help="database to protect (a copy is made; the file itself is only read)")
    args = ap.parse_args()
    src = os.path.abspath(args.db)
    if not os.path.isfile(src):
        print(f"no such database: {src}", file=sys.stderr)
        return 1

    failures = []
    root = tempfile.mkdtemp(prefix="lienka-gate-")
    try:
        # --- 1. restore the backup under the candidate code -------------------------
        d1 = os.path.join(root, "restore")
        os.makedirs(d1)
        shutil.copy2(src, os.path.join(d1, "baby.db"))
        for ext in ("-wal", "-shm"):
            if os.path.exists(src + ext):
                shutil.copy2(src + ext, d1 + os.sep + "baby.db" + ext)
        before = sql_metrics(src)
        print(f"gate: {src}\n      baseline rows={before['total']} ml={before['ml']}")
        r1 = Instance(d1)
        try:
            r1.start()
        except RuntimeError as e:
            print(f"FAIL restore/boot: {e}")
            return 1
        # --- 2. startup migrations must preserve everything -------------------------
        after_boot = sql_metrics(os.path.join(d1, "baby.db"))
        failures.append(compare("migrate (startup vs backup)", before, after_boot))
        failures.append(compare("api metrics (restored)", before, api_metrics(r1)))

        # --- 3. csv export must carry every row -------------------------------------
        raw = r1.get("/export.csv")
        rows = list(csv.reader(io.StringIO(raw)))
        header, data = rows[0], [r for r in rows[1:] if any(c.strip() for c in r)]
        need = {"id", "user", "kind", "at", "feed_ml", "pump_ml", "fed_ml", "source_pump_id", "expires_on"}
        if not need.issubset(set(header)):
            print(f"FAIL export: header missing {sorted(need - set(header))}"); failures.append(False)
        elif len(data) != before["total"]:
            print(f"FAIL export: {len(data)} csv rows vs {before['total']} in db"); failures.append(False)
        else:
            print(f"PASS export: header complete, {len(data)} rows")
            failures.append(True)
        r1.stop()

        # --- 4. replay the export into a fresh instance -----------------------------
        d2 = os.path.join(root, "reimport")
        os.makedirs(d2)
        r2 = Instance(d2)
        r2.start()                      # boot once so init_db creates the current schema
        r2.stop()
        csv_path = os.path.join(root, "export.csv")
        with open(csv_path, "w", encoding="utf-8") as fh:
            fh.write(raw)
        done = subprocess.run([sys.executable, IMPORTER, "--db", os.path.join(d2, "baby.db"), "--csv", csv_path],
                              capture_output=True, text=True)
        if done.returncode != 0:
            print(f"FAIL import tool: {done.stdout}{done.stderr}"); failures.append(False)
        else:
            r2.start()
            failures.append(compare("import round-trip", before, api_metrics(r2)))
            r2.stop()
    finally:
        shutil.rmtree(root, ignore_errors=True)

    if all(failures) and failures:
        print("RESULT: GATE OK — backup, migrations, export and import all verified against this code.")
        return 0
    print("RESULT: GATE BLOCKED — do not release/deploy until every check passes.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
