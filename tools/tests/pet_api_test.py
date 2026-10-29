#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Michal Kohutek
# SPDX-License-Identifier: GPL-3.0-only

"""v1.25 Lienka buddy smoke: GET /api/pet is pure derivation — no stored state, forgiving moods.

Needs a CLEAN scratch server:
    rm -rf /tmp/lienka-pet && mkdir -p /tmp/lienka-pet
    DATA_DIR=/tmp/lienka-pet PORT=8504 HTTP_PORT=0 python3 server.py &
    python3 tools/tests/pet_api_test.py [BASE]   # default http://localhost:8504
"""
import datetime
import json
import sys
import time
import urllib.error
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8504"
ok = True
MOODS = ["radiant", "happy", "content", "sleepy", "asleep"]
REASONS = ["just_logged", "steady_today", "quiet_day", "long_quiet", "very_quiet"]


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


def pet():
    s, r = call("GET", "/api/pet")
    check(f"GET /api/pet answers 200 ({s})", s == 200)
    if r.get("exists"):
        check("mood/reason are known codes", r.get("mood") in MOODS and r.get("reason") in REASONS)
        check("energy stays in 0..100", isinstance(r.get("energy"), int) and 0 <= r["energy"] <= 100)
    return r


today = datetime.date.today()
t_iso = today.isoformat()
y_iso = (today - datetime.timedelta(days=1)).isoformat()
now_hm = time.strftime("%H:%M")
quiet_day = (today - datetime.timedelta(days=9)).isoformat()

# a bug does not exist until the first entry hatches her
r = pet()
check("no entries yet -> exists false", r.get("exists") is False)

# only a 9-day-old log: she dozes (never gone), hatched on that first entry, outside the 7-day window
s, _ = call("POST", "/api/entries", {"user": "parent1", "kind": "diaper", "at": quiet_day + "T09:00",
                                     "diaper_type": "wet"})
check("old diaper accepted", s == 201)
r = pet()
check("one old entry hatches her", r.get("exists") is True and r.get("hatched_on") == quiet_day)
check("quiet -> dozing, never punished further", r.get("mood") == "asleep" and r.get("reason") == "very_quiet")
check("energy bottoms out at 0 but the bug stays", r.get("energy") == 0)
check("9 days ago is outside the 7-day window", r.get("days_logged_7") == 0 and r.get("care_today") == 0)
check("no birth date: age from first log, no spots yet", r.get("age_basis") == "first_log"
      and r.get("age_days") is None and r.get("spots") == 0)

# fresh care today wakes her right up (this is the forgiveness mechanic in action)
s, _ = call("POST", "/api/entries", {"user": "parent1", "kind": "diaper", "at": t_iso + "T" + now_hm,
                                     "diaper_type": "dirty"})
s, _ = call("POST", "/api/entries", {"user": "parent1", "kind": "diaper",
                                     "at": (today - datetime.timedelta(days=1)).isoformat() + "T10:00",
                                     "diaper_type": "wet"})
r = pet()
check("a fresh log wakes her from dozing", r.get("mood") != "asleep" and r.get("energy") >= 50)
check("last_log_at tracks the newest entry", r.get("last_log_at", "").startswith(t_iso)
      and r.get("hours_since_log") is not None and r.get("hours_since_log") <= 1)
check("7-day contact counts days, not entries", r.get("days_logged_7") == 2)
check("today counts one care event", r.get("care_today") == 1)

# a note still "hears from you" but adds no care points
s, _ = call("POST", "/api/entries", {"user": "parent1", "kind": "note", "at": t_iso + "T" + now_hm,
                                     "note": "first smile"})
r = pet()
check("a note counts as contact but adds no care points", r.get("care_today") == 1 and r.get("days_logged_7") == 2)

# spots follow age: one per completed 52 weeks, all seven around the first birthday
birth200 = (today - datetime.timedelta(days=200)).isoformat()
call("POST", "/api/settings", {"birth_date": birth200})
r = pet()
check("age from saved birth date", r.get("age_basis") == "birth" and r.get("age_days") == 200)
check("200 days -> 3 spots", r.get("spots") == 3)
check("older baby expects fewer daily care events", r.get("expected_today") == 8)

birth400 = (today - datetime.timedelta(days=400)).isoformat()
call("POST", "/api/settings", {"birth_date": birth400})
r = pet()
check("400 days -> the full seven spots", r.get("spots") == 7 and r.get("expected_today") == 6)

# energy is monotone in fresh care, and repeated GETs are stable: nothing about her is stored
before = pet().get("energy")
call("POST", "/api/entries", {"user": "parent1", "kind": "diaper", "at": t_iso + "T" + now_hm,
                              "diaper_type": "mixed"})
after = pet()
check("more care today never lowers her energy", after.get("energy") >= before)
again = pet()
check("GET is read-only: identical answers back to back",
      all(again.get(k) == after.get(k) for k in ("mood", "spots", "days_logged_7", "care_today")))

# --- murmurs: pure facts, right now nothing worth saying yet in this bare dataset -----------
KNOWN_CODES = {"record_sleep", "week_gain", "seen_run", "weeks_birthday", "stash_grew", "no_walk"}
TONES = {"cheer", "note", "gentle"}


def murmur_ok(m):
    return m.get("code") in KNOWN_CODES and m.get("tone") in TONES and isinstance(m.get("params"), dict)


def murmur_oks(ms):
    return all(murmur_ok(x) for x in ms)


murmurs = after.get("murmurs") or []
check("murmurs ride along with every pet response", isinstance(after.get("murmurs"), list))
check("nothing to celebrate in a bare dataset, no invented chatter", murmur_oks(murmurs) and not murmurs)

# seed a sleep record day: previous best 3h05 last night, new best 6h12 this morning
call("POST", "/api/entries", {"user": "parent1", "kind": "sleep", "at": y_iso + "T20:00",
                              "end_at": y_iso + "T23:05"})
call("POST", "/api/entries", {"user": "parent1", "kind": "sleep", "at": t_iso + "T09:00",
                              "end_at": t_iso + "T15:12"})
# weekly scale gain 4200 -> 4380 g
call("POST", "/api/entries", {"user": "parent1", "kind": "measure",
                              "at": (today - datetime.timedelta(days=7)).isoformat() + "T08:00",
                              "measure_kind": "weight_g", "value": 4200})
call("POST", "/api/entries", {"user": "parent1", "kind": "measure", "at": t_iso + "T08:00",
                              "measure_kind": "weight_g", "value": 4380})
# third consecutive day with a log, and a walk 4 days ago that has been quiet since
call("POST", "/api/entries", {"user": "parent1", "kind": "diaper",
                              "at": (today - datetime.timedelta(days=2)).isoformat() + "T09:00",
                              "diaper_type": "wet"})
call("POST", "/api/entries", {"user": "parent1", "kind": "walk",
                              "at": (today - datetime.timedelta(days=4)).isoformat() + "T16:00",
                              "end_at": (today - datetime.timedelta(days=4)).isoformat() + "T17:00"})
m = pet().get("murmurs") or []
codes = [x.get("code") for x in m]
check("murmurs stay well-shaped and capped at 4", len(m) <= 4 and all(murmur_ok(x) for x in m))
check("new sleep record voiced first with exact hours", codes[:1] == ["record_sleep"]
      and m[0]["params"].get("h") == 6.2 and m[0]["params"].get("prev") == 3.1)
check("weekly weight gain after that, grams and span exact",
      "week_gain" in codes and [x for x in m if x["code"] == "week_gain"][0]["params"] == {"g": 180, "days": 7})
check("3-day seen streak joins", "seen_run" in codes
      and [x for x in m if x["code"] == "seen_run"][0]["params"] == {"n": 3})
check("quiet walks observed gently (facts about entries, not advice)",
      "no_walk" in codes and [x for x in m if x["code"] == "no_walk"][0]["tone"] == "gentle"
      and [x for x in m if x["code"] == "no_walk"][0]["params"] == {"d": 4})

print("OK" if ok else "FAILURES")
sys.exit(0 if ok else 1)
