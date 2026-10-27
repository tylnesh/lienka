#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Michal Kohutek
# SPDX-License-Identifier: GPL-3.0-only

"""v1.23 API smoke: pumping kind, bank math, links, height measures.

Run against a scratch server on a throwaway DB:
    rm -rf /tmp/lienka-test && mkdir -p /tmp/lienka-test
    DATA_DIR=/tmp/lienka-test PORT=8499 HTTP_PORT=0 python3 server.py &
    python3 tools/tests/pump_api_test.py [BASE]   # default http://localhost:8499
"""
import json
import sqlite3
import sys
import time
import urllib.error
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8499"
DB = None  # set via --db for the legacy-restart step; steps skip it when absent
ok = True


def call(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def check(label, cond):
    global ok
    print(("PASS" if cond else "FAIL"), label)
    ok = ok and bool(cond)


today = time.strftime("%Y-%m-%d")

# split mode: pump session, later bottle drawn from it (linked)
s, r = call("POST", "/api/entries", {"user": "parent1", "kind": "pump", "at": today + "T08:00",
                                     "end_at": today + "T08:25", "pump_ml": 120, "pump_side": "both"})
check("POST pump closed session", s == 201 and r["entry"]["pump_ml"] == 120)
pump_id = r["entry"]["id"]
s, r = call("POST", "/api/entries", {"user": "parent1", "kind": "feed", "at": today + "T10:00",
                                     "feed_method": "bottle_expressed", "feed_ml": 90,
                                     "source_pump_id": pump_id})
check("POST bottle linked to pump", s == 201 and r["entry"]["source_pump_id"] == pump_id)

# combined mode: baby drank at the pump
s, r = call("POST", "/api/entries", {"user": "parent1", "kind": "pump", "at": today + "T12:00",
                                     "end_at": today + "T12:30", "pump_ml": 60, "fed_ml": 40, "pump_side": "left"})
check("POST combined pump w/ fed_ml", s == 201 and r["entry"]["fed_ml"] == 40)

# open timer + stop via PUT
s, r = call("POST", "/api/entries", {"user": "parent1", "kind": "pump", "at": today + "T15:00", "timer": 1})
check("POST pump timer opens", s == 201 and r["entry"]["end_at"] is None)
timer_id = r["entry"]["id"]
s, summary = call("GET", "/api/summary")
check("open pump in open_logs", any(l["id"] == timer_id for l in summary["open_logs"]))
check("bank before stop: 120-90+20", summary["bank_ml"] == 50)
s, r = call("PUT", f"/api/entries/{timer_id}", {"end_at": today + "T15:20", "pump_ml": 50})
check("PUT stops pump timer", s == 200 and r["entry"]["pump_ml"] == 50)

s, summary = call("GET", "/api/summary")
td = summary["today"]
check("bank after stop: +50 -> 100", summary["bank_ml"] == 100)
check("pumps=3, pump_ml=230", td["pumps"] == 3 and td["pump_ml"] == 230)
check("intake feed_ml includes fed_ml(40)+bottle(90)", td["feed_ml"] == 130)
check("bank_delta today = 230-130 = 100", td["bank_delta"] == 100)
check("pump_minutes recorded", td["pump_minutes"] >= 25 + 30)

# height measure
s, r = call("POST", "/api/entries", {"user": "parent1", "kind": "measure", "at": today + "T09:00",
                                     "measure_kind": "height_cm", "value": 52.5})
check("POST height_cm", s == 201 and r["entry"]["value"] == 52.5)

# validation rejections
s, r = call("POST", "/api/entries", {"user": "parent1", "kind": "pump", "at": today + "T09:00", "pump_side": "middle"})
check("bad pump_side rejected", s == 400 and r.get("errors", {}).get("pump_side") == "bad_value")
s, r = call("POST", "/api/entries", {"user": "parent1", "kind": "feed", "at": today + "T09:00",
                                     "feed_method": "bottle_expressed", "source_pump_id": 999999})
check("dangling source link rejected", s == 400 and r.get("errors", {}).get("source_pump_id") == "not_found")
s, r = call("POST", "/api/entries", {"user": "parent1", "kind": "feed", "at": today + "T09:00",
                                     "feed_method": "bottle_expressed", "source_pump_id": pump_id + 1})
check("link to non-pump rejected", s == 400)

# CSV carries the new columns
csv = urllib.request.urlopen(BASE + "/export.csv").read().decode()
head = csv.splitlines()[0]
check("csv has pump columns", all(c in head for c in ("pump_ml", "pump_side", "fed_ml", "source_pump_id")))

print("RESULT:", "ALL OK" if ok else "FAILURES")
sys.exit(0 if ok else 1)
