#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Michal Kohutek
# SPDX-License-Identifier: GPL-3.0-only

"""v1.23 milk-bank smoke: per-session bags, linked + FIFO draw-down, expiry buckets, short.

Needs a CLEAN scratch server (the assertions are absolute):
    rm -rf /tmp/lienka-stash && mkdir -p /tmp/lienka-stash
    DATA_DIR=/tmp/lienka-stash PORT=8500 HTTP_PORT=0 python3 server.py &
    python3 tools/tests/stash_api_test.py [BASE]   # default http://localhost:8500
"""
import json, sys, time, urllib.request, urllib.error, datetime
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8500"
ok = True
def call(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r: return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read())
def check(label, cond):
    global ok; print(("PASS" if cond else "FAIL"), label); ok = ok and bool(cond)

today = time.strftime("%Y-%m-%d")
d1 = (datetime.date.today() - datetime.timedelta(days=2)).isoformat()
exp_far = (datetime.date.today() + datetime.timedelta(days=120)).isoformat()
exp_soon = (datetime.date.today() + datetime.timedelta(days=5)).isoformat()
exp_past = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()

# bag A: 100 pumped, baby drank 30 at the pump, linked bottle takes 50 -> free 20
s, a = call("POST", "/api/entries", {"user": "parent1", "kind": "pump", "at": d1 + "T08:00", "end_at": d1 + "T08:20",
                                     "pump_ml": 100, "fed_ml": 30, "expires_on": exp_far})
check("POST with expires_on", s == 201 and a["entry"]["expires_on"] == exp_far)
s, b = call("POST", "/api/entries", {"user": "parent1", "kind": "pump", "at": d1 + "T12:00", "end_at": d1 + "T12:20",
                                     "pump_ml": 80, "expires_on": exp_soon})
check("bag B created", s == 201)
aid, bid = a["entry"]["id"], b["entry"]["id"]
s, f = call("POST", "/api/entries", {"user": "parent1", "kind": "feed", "at": d1 + "T10:00",
                                     "feed_method": "bottle_expressed", "feed_ml": 50, "source_pump_id": aid})
check("linked bottle", s == 201)
# unlinked bottle 60 -> FIFO should drain A's remaining 20 first, then take 40 from B
s, f2 = call("POST", "/api/entries", {"user": "parent1", "kind": "feed", "at": d1 + "T15:00",
                                      "feed_method": "bottle_expressed", "feed_ml": 60})
check("unlinked bottle", s == 201)
s, st = call("GET", "/api/stash")
bags = {x["id"]: x for x in st["bags"]}
check("A free = 100-30-50-20 = 0", bags[aid]["free"] == 0 and bags[aid]["taken"] == 70)
check("B free = 80-40 = 40 (FIFO overflow)", bags[bid]["free"] == 40 and bags[bid]["taken"] == 40)
check("balance 40, no short", st["balance"] == 40 and st["short"] == 0)
# expired + soon bags
call("POST", "/api/entries", {"user": "parent1", "kind": "pump", "at": d1 + "T18:00", "end_at": d1 + "T18:15", "pump_ml": 30, "expires_on": exp_past})
call("POST", "/api/entries", {"user": "parent1", "kind": "pump", "at": d1 + "T20:00", "end_at": d1 + "T20:15", "pump_ml": 25, "expires_on": exp_soon})
s, st = call("GET", "/api/stash")
check("expired_ml 30", st["expired_ml"] == 30)
check("soon_ml 40+25=65 (B still free 40 + new 25)", st["soon_ml"] == 65)
# bottle beyond every drop -> short reported (free before the big feed was 40+30+25=95)
s, pre = call("GET", "/api/stash")
check("free before big bottle is 95", pre["balance"] == 95)
s, f3 = call("POST", "/api/entries", {"user": "parent1", "kind": "feed", "at": today + "T09:00",
                                      "feed_method": "bottle_expressed", "feed_ml": 500})
s, st = call("GET", "/api/stash")
check("short = 500-95, bank drained", st["short"] == 405 and st["balance"] == 0)
# bad date rejected
s, r = call("POST", "/api/entries", {"user": "parent1", "kind": "pump", "at": today + "T09:00", "expires_on": "tomorrow"})
check("bad expires_on rejected", s == 400 and r.get("errors", {}).get("expires_on") == "bad_value")
# PUT can clear it
s, f4 = call("POST", "/api/entries", {"user": "parent1", "kind": "pump", "at": today + "T10:00", "end_at": today + "T10:20", "pump_ml": 15, "expires_on": exp_far})
s, r = call("PUT", f"/api/entries/{f4['entry']['id']}", {"expires_on": ""})
check("PUT clears expires_on", s == 200 and r["entry"]["expires_on"] is None)
# summary heights
s, sm = call("GET", "/api/summary")
check("summary carries heights list", isinstance(sm.get("heights"), list))
print("RESULT:", "ALL OK" if ok else "FAILURES")
raise SystemExit(0 if ok else 1)
