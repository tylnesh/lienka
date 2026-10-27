#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Michal Kohutek
# SPDX-License-Identifier: GPL-3.0-only

"""v1.24 multi-tier bank smoke: fridge/freezer storage, tier-aware draw order, freeze-surplus.

Needs a CLEAN scratch server:
    rm -rf /tmp/lienka-tier && mkdir -p /tmp/lienka-tier
    DATA_DIR=/tmp/lienka-tier PORT=8501 HTTP_PORT=0 python3 server.py &
    python3 tools/tests/tier_api_test.py [BASE]   # default http://localhost:8501
"""
import datetime
import json
import sys
import urllib.error
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8501"
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


today = datetime.date.today()
t_iso = today.isoformat()
far_freezer = (today + datetime.timedelta(days=180)).isoformat()

# defaults and validation around the new tier field
s, r = call("POST", "/api/entries", {"user": "parent1", "kind": "pump", "at": t_iso + "T20:00",
                                     "end_at": t_iso + "T20:20", "pump_ml": 300})
check("pump defaults to fridge tier", s == 201 and r["entry"]["pump_storage"] == "fridge")
fz_id = None
s, r = call("POST", "/api/entries", {"user": "parent1", "kind": "pump",
                                     "at": (today - datetime.timedelta(days=1)).isoformat() + "T20:00",
                                     "end_at": (today - datetime.timedelta(days=1)).isoformat() + "T20:25",
                                     "pump_ml": 300, "pump_storage": "freezer", "expires_on": far_freezer})
check("freezer tier accepted", s == 201 and r["entry"]["pump_storage"] == "freezer")
fz_id = r["entry"]["id"]
s, r = call("POST", "/api/entries", {"user": "parent1", "kind": "pump", "at": t_iso + "T21:00", "pump_storage": "porridge"})
check("bad storage rejected", s == 400 and r.get("errors", {}).get("pump_storage") == "bad_value")

# the fridge bag is YOUNGER than the freezer stash, but must be drawn from first
s, fr = call("POST", "/api/entries", {"user": "parent1", "kind": "pump", "at": t_iso + "T08:00",
                                      "end_at": t_iso + "T08:15", "pump_ml": 100,
                                      "expires_on": (today + datetime.timedelta(days=4)).isoformat()})
fr_id = fr["entry"]["id"]
s, b = call("POST", "/api/entries", {"user": "parent1", "kind": "feed", "at": t_iso + "T09:00",
                                     "feed_method": "bottle_expressed", "feed_ml": 80})
s, st = call("GET", "/api/stash")
bags = {x["id"]: x for x in st["bags"]}
check("fridge drawn before older freezer bag", bags[fr_id]["free"] == 20 and bags[fz_id]["free"] == 300)
# fridge tier holds the drawn-down 20 ml bag + the 300 ml default-tier bag from the very first POST
check("tier totals split correctly", st["fridge_ml"] == 320 and st["freezer_ml"] == 300)

# a bottle may only drink milk that existed by its time — bags pumped later are untouchable,
# even sitting conveniently in the fridge tier
s, fut = call("POST", "/api/entries", {"user": "parent1", "kind": "pump", "at": t_iso + "T23:00",
                                       "end_at": t_iso + "T23:15", "pump_ml": 90})
fut_id = fut["entry"]["id"]
s, st = call("GET", "/api/stash")
bags = {x["id"]: x for x in st["bags"]}
check("bottles never drink milk from the future", bags[fut_id]["free"] == 90 and bags[fr_id]["free"] == 20)

s, st = call("POST", "/api/stash/freeze", {})
bags = {x["id"]: x for x in st["bags"]}
fr_bag = bags[fr_id]
# three fridge bags held free milk at this point: the 20 ml leftovers, the future 300 ml bag (its bottles
# can never drink it, so it arrives intact) and the 90 ml end-of-day bag
check("froze moves every free fridge bag", s == 200 and st["froze"] == 3)
check("bag moved to freezer with fresh +180 d dating",
      fr_bag["storage"] == "freezer" and fr_bag["expires_on"] == (today + datetime.timedelta(days=180)).isoformat())
check("balance survived the freeze untouched", st["balance"] == 710 and st["fridge_ml"] == 0 and st["freezer_ml"] == 710)

# with the fridge tier empty, draw-down falls back to freezer oldest-first — and because the books are
# recomputed honestly, both bottles settle onto the yesterday stash that was actually there in time
s, b2 = call("POST", "/api/entries", {"user": "parent1", "kind": "feed", "at": t_iso + "T11:00",
                                      "feed_method": "bottle_expressed", "feed_ml": 40})
s, st = call("GET", "/api/stash")
bags = {x["id"]: x for x in st["bags"]}
check("freezer draw is oldest-first by time-of-milk", bags[fz_id]["free"] == 180 and bags[fr_id]["free"] == 100)

# selective freeze only touches the requested bags
s, g = call("POST", "/api/entries", {"user": "parent1", "kind": "pump", "at": t_iso + "T12:00",
                                     "end_at": t_iso + "T12:10", "pump_ml": 50})
g_id = g["entry"]["id"]
s, st = call("POST", "/api/stash/freeze", {"ids": [g_id]})
bags = {x["id"]: x for x in st["bags"]}
check("selective freeze froze exactly the picked bag", st["froze"] == 1 and bags[g_id]["storage"] == "freezer")
check("untouched bags keep their tier", bags[fz_id]["storage"] == "freezer" and bags[fr_id]["storage"] == "freezer")

# empty selection is a no-op, not an error; balance stays honest
s, st = call("POST", "/api/stash/freeze", {})
check("freeze with nothing left in fridge is a no-op", s == 200 and st["froze"] == 0)
check("csv export carries the storage tier", "pump_storage" in urllib.request.urlopen(BASE + "/export.csv").read().decode().splitlines()[0])

print("RESULT:", "ALL OK" if ok else "FAILURES")
sys.exit(0 if ok else 1)
