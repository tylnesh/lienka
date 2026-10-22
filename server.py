#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Michal Kohutek
# SPDX-License-Identifier: GPL-3.0-only

"""Lienka — baby log: shared diary of nappies, feeds, sleep, measurements and notes for a small group of caregivers.

Standard library only (runs anywhere, e.g. in python:3.12-alpine). One SQLite file is the whole state.

    DATA_DIR    writable folder holding baby.db          default: /data
    HOST        bind address                             default: 0.0.0.0
    PORT        HTTPS listener                           default: 8472
    HTTP_PORT   plain HTTP listener, only /ca.crt        default: 8473 (0 = off)
    CERT, KEY   TLS certificate and key (PEM); without them the app serves plain HTTP on PORT
    CA_CERT     root certificate offered at /ca.crt
    USERS       comma-separated caregiver ids shown in the UI   default: parent1,parent2,others
    BIRTH_DATE  used for the age readout, e.g. 2026-01-15       default: "" (age hidden)
                (both env values are first-run defaults only — once saved in the app's Settings /
                 setup card they live in the DB `settings` table and those win from then on)
    TZ          container timezone; event times are wall-clock local time

API:
    GET    /api/meta
    GET    /api/settings            effective family settings {users, birth_date, configured}
    POST   /api/settings            {users?, birth_date?, renames?:[{from,to}]} — renames rewrite past entries' user label
    GET    /api/entries?from=YYYY-MM-DD&to=YYYY-MM-DD&user=&kind=&limit=
    POST   /api/entries            {user,kind,at,...}
    PUT    /api/entries/<id>       partial update (used to end a running sleep)
    DELETE /api/entries/<id>
    GET    /api/tasks              planned (not implemented yet): recurring care tasks (vitamin D, stretches, ...)
    POST   /api/tasks              planned: {title, detail?, per_day?, times?, icon?}
    PUT    /api/tasks/<id>         planned: partial update
    DELETE /api/tasks/<id>         planned: removes the task; existing "task" entries keep their title snapshot
    GET    /api/summary?days=7     per-day buckets + today + weights + open logs
    GET    /export.csv?from=&to=
    GET    /healthz
"""
import json
import os
import re
import sqlite3
import ssl
import sys
import threading
import time
from datetime import date, datetime, timedelta, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.abspath(os.environ.get("DATA_DIR", "/data" if os.path.isdir("/data") else HERE))
STATIC = os.path.join(HERE, "static")
DB = os.path.join(DATA, "baby.db")
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8472"))
HTTP_PORT = int(os.environ.get("HTTP_PORT", "8473"))
CERT = os.environ.get("CERT", "")
KEY = os.environ.get("KEY", "")
CA_CERT = os.environ.get("CA_CERT", "")
BIRTH_DATE = os.environ.get("BIRTH_DATE", "")
VERSION = "1.20"

LOCK = threading.Lock()
USERS = [u.strip() for u in os.environ.get("USERS", "parent1,parent2,others").split(",") if u.strip()] or ["parent1", "parent2", "others"]
KINDS = ["diaper", "feed", "sleep", "walk", "bath", "medication", "activity", "task", "measure", "note"]
TIMER_KINDS = ["feed", "sleep", "walk", "bath", "activity"]
DIAPER_TYPES = ["wet", "dirty", "mixed"]
DIAPER_COLOURS = ["mustard", "yellow", "green", "brown", "black", "red", "other"]
FEED_METHODS = ["breast_left", "breast_right", "bottle_expressed", "bottle_formula", "pump"]
MEASURE_KINDS = ["weight_g", "temp_c", "vitd_iu"]
TASK_REPEATS = ["daily", "weekly", "monthly"]
TASK_ICONS = ["bell", "pill", "calendar", "heart", "sun", "moon", "star", "walk", "bath", "bottle", "scale", "note", "clock", "home", "check"]
TASK_COLORS = ["#2f8f78", "#d9822b", "#5b8def", "#b56576", "#8b5cf6", "#d64545", "#6b7280"]
TASK_ICONS = ["heart", "pill", "star", "clock", "sun", "moon", "walk", "bath"]
MAX_BODY = 8192
MAX_BODY_PHOTO = 4_000_000

FIELDS = [
    "id", "user", "kind", "at", "created", "updated", "diaper_type", "diaper_colour",
    "feed_method", "feed_minutes", "feed_ml", "swallows", "end_at",
    "measure_kind", "value", "note", "timer", "med_name", "dose", "activity", "task_id",
    "scale_before_g", "scale_after_g", "pausable", "paused_at", "pause_seconds",
]

TASK_FIELDS = ["id", "title", "detail", "per_day", "times", "icon", "created", "updated"]

TYPES = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
         ".css": "text/css; charset=utf-8", ".crt": "application/x-x509-ca-cert",
         ".csv": "text/csv; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
         ".json": "application/json"}


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def current_settings() -> dict:
    """Family settings kept in the DB; the USERS / BIRTH_DATE env vars act as first-run defaults only.
    Once saved via POST /api/settings (Settings UI / first-run card), stored values win."""
    users, birth, keys = list(USERS), BIRTH_DATE, set()
    try:
        with db() as conn:
            rows = conn.execute("SELECT key, value FROM settings").fetchall()
    except sqlite3.Error:  # fresh data dir before init_db — fall back to env defaults
        rows = []
    for row in rows:
        keys.add(row["key"])
        if row["key"] == "users":
            try:
                parsed = json.loads(row["value"])
                if isinstance(parsed, list) and parsed:
                    users = [str(u) for u in parsed]
            except ValueError:
                pass
        elif row["key"] == "birth_date":
            birth = row["value"]
    return {"users": users, "birth_date": birth, "configured": "users" in keys}


def init_db() -> None:
    os.makedirs(DATA, exist_ok=True)
    with db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS entries(
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user TEXT NOT NULL,
              kind TEXT NOT NULL,
              at TEXT NOT NULL,
              created TEXT NOT NULL,
              updated TEXT,
              diaper_type TEXT, diaper_colour TEXT,
              feed_method TEXT, feed_minutes INTEGER, feed_ml INTEGER, swallows INTEGER,
              end_at TEXT,
                measure_kind TEXT, value REAL,
                med_name TEXT, dose TEXT, activity TEXT,
                note TEXT,
                timer INTEGER DEFAULT 0
             );
            CREATE INDEX IF NOT EXISTS entries_at ON entries(at DESC);
            CREATE TABLE IF NOT EXISTS tasks(
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              title TEXT NOT NULL,
              detail TEXT,
              per_day INTEGER DEFAULT 1,
              times TEXT,
              icon TEXT,
              created TEXT NOT NULL,
              updated TEXT
            );
            """
        )
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS task_checkins(
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              task_id INTEGER NOT NULL,
              scheduled_at TEXT NOT NULL,
              status TEXT NOT NULL,
              user TEXT,
              note TEXT,
              entry_id INTEGER,
              created TEXT NOT NULL,
              UNIQUE(task_id, scheduled_at)
            );
            CREATE INDEX IF NOT EXISTS task_checkins_time ON task_checkins(scheduled_at DESC);
            """
        )
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS settings(
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            );
            """
        )
        task_cols = [row[1] for row in conn.execute("PRAGMA table_info(tasks)")]
        for name, sql in [
            ("repeat", "TEXT DEFAULT 'daily'"),
            ("days", "TEXT DEFAULT '[]'"),
            ("color", "TEXT DEFAULT '#2f8f78'"),
            ("active", "INTEGER DEFAULT 1"),
            ("start_date", "TEXT"),
            ("end_date", "TEXT"),
            ("interval_minutes", "INTEGER"),
            ("times_per_day", "INTEGER DEFAULT 1"),
            ("duration_minutes", "INTEGER DEFAULT 15"),
        ]:
            if name not in task_cols:
                conn.execute(f"ALTER TABLE tasks ADD COLUMN {name} {sql}")
        cols = [row[1] for row in conn.execute("PRAGMA table_info(entries)")]
        if "updated" not in cols:
            conn.execute("ALTER TABLE entries ADD COLUMN updated TEXT")
        if "timer" not in cols:
            conn.execute("ALTER TABLE entries ADD COLUMN timer INTEGER DEFAULT 0")
        if "task_id" not in cols:
            conn.execute("ALTER TABLE entries ADD COLUMN task_id INTEGER")
        conn.execute("CREATE INDEX IF NOT EXISTS entries_task ON entries(task_id, at DESC)")
        for name in ("med_name", "dose", "activity"):
            if name not in cols:
                conn.execute(f"ALTER TABLE entries ADD COLUMN {name} TEXT")
        for name, sql in (("scale_before_g", "REAL"), ("scale_after_g", "REAL"), ("photo_a", "TEXT"), ("photo_b", "TEXT")):
            if name not in cols:
                conn.execute(f"ALTER TABLE entries ADD COLUMN {name} {sql}")
        for name, sql in (("pausable", "INTEGER DEFAULT 0"), ("paused_at", "TEXT"), ("pause_seconds", "INTEGER DEFAULT 0")):
            if name not in cols:
                conn.execute(f"ALTER TABLE entries ADD COLUMN {name} {sql}")


# ---------- optional LLM backend (BYO endpoint; key stays server-side only) ----------
LLM_PATH = os.path.join(DATA, "llm.json")
LLM_PROVIDERS = ("off", "openai", "anthropic", "custom")
LLM_PRESET_BASES = {"openai": "https://api.openai.com/v1", "anthropic": "https://api.anthropic.com"}
SCALE_PROMPT = ("The photo shows the digital display of a baby scale; the seven-segment digits may look "
                "sideways or upside down. Report the number exactly as printed (kilograms, keep every "
                "digit and the decimal point), e.g. 3.973 or 4.009. Reply with only that number. "
                "If no display is visible, reply: none")
SCALE_PROMPT_2 = ("The SAME photo of a digital baby-scale display is attached several times: as taken "
                  "and additionally rotated by 90 degrees both ways, so in at least one copy the "
                  "seven-segment digits stand upright. Use whichever copy is easiest to read. Report "
                  "the number exactly as printed (kilograms, keep every digit and the decimal point), "
                  "e.g. 3.973 or 4.009. Reply with only that number. If no display is visible, reply: none")


def llm_load() -> dict:
    cfg = {"provider": "off", "base_url": "", "model": "", "api_key": "", "max_tokens": 900, "temperature": 0.4}
    try:
        with open(LLM_PATH, encoding="utf-8") as fh:
            stored = json.load(fh)
        if isinstance(stored, dict):
            for k in ("provider", "base_url", "model", "api_key"):
                if isinstance(stored.get(k), str):
                    cfg[k] = stored[k]
            if cfg["provider"] not in LLM_PROVIDERS:
                cfg["provider"] = "off"
            for k, lo, hi in (("max_tokens", 64, 4096), ("temperature", 0.0, 1.0)):
                v = stored.get(k)
                if isinstance(v, (int, float)) and not isinstance(v, bool) and lo <= v <= hi:
                    cfg[k] = v
    except (OSError, json.JSONDecodeError):
        pass
    return cfg


def llm_save(cfg: dict) -> None:
    # unique temp name per process+thread: settings blur + Test can save concurrently
    tmp = f"{LLM_PATH}.{os.getpid()}.{threading.get_ident()}.tmp"
    try:
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(cfg, fh, ensure_ascii=False)
        os.chmod(tmp, 0o600)
        os.replace(tmp, LLM_PATH)
    finally:
        if os.path.exists(tmp):
            try:
                os.remove(tmp)
            except OSError:
                pass


def llm_public(cfg: dict) -> dict:
    out = {k: cfg[k] for k in ("provider", "base_url", "model", "max_tokens", "temperature")}
    out["has_key"] = bool(cfg.get("api_key"))
    return out


def llm_timeout(cfg: dict, kind: str) -> int:
    # local runtimes (Ollama et al) may spend minutes loading weights on first call
    base = (cfg.get("base_url") or LLM_PRESET_BASES.get(cfg["provider"], ""))
    if any(h in base for h in ("localhost", "127.0.0.1", ".local", "192.168.", "10.", "172.16.", "172.17.")):
        return 150
    return 45 if kind == "test" else 90


def _anthropic_msg(m: dict) -> dict:
    """OpenAI-style message -> Anthropic blocks (an image_url part becomes a base64 image source)."""
    content = m.get("content")
    if not isinstance(content, list):
        return {"role": m["role"], "content": content}
    blocks = []
    for part in content:
        if not isinstance(part, dict):
            continue
        if part.get("type") == "text":
            blocks.append({"type": "text", "text": str(part.get("text", ""))})
        elif part.get("type") == "image_url":
            url = str((part.get("image_url") or {}).get("url", ""))
            src = re.match(r"^data:(image/[a-z+]+);base64,([A-Za-z0-9+/=]+)$", url)
            if src:
                blocks.append({"type": "image", "source": {"type": "base64", "media_type": src.group(1), "data": src.group(2)}})
    return {"role": m["role"], "content": blocks}


def llm_call(cfg: dict, messages: list, timeout: int = 75, max_tokens: int = 0, temperature=None) -> str:
    model = cfg.get("model") or ""
    base = (cfg.get("base_url") or LLM_PRESET_BASES.get(cfg["provider"], "")).rstrip("/")
    if cfg["provider"] == "off" or not model or (cfg["provider"] != "anthropic" and not base):
        raise ValueError("not_configured")
    mt = max_tokens or cfg["max_tokens"]
    temp = cfg["temperature"] if temperature is None else temperature
    key = cfg.get("api_key") or ""
    if cfg["provider"] == "anthropic":
        base = base or "https://api.anthropic.com"
        system = "\n".join(str(m["content"]) for m in messages
                           if m["role"] == "system" and isinstance(m.get("content"), str))
        payload = {"model": model, "max_tokens": mt, "temperature": temp,
                   "messages": [_anthropic_msg(m) for m in messages if m["role"] != "system"]}
        if system:
            payload["system"] = system
        req = Request(base + "/v1/messages", data=json.dumps(payload).encode(), method="POST",
                      headers={"Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01"})
        with urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read(400_000).decode("utf-8"))
        blocks = data.get("content") or []
        return "".join(b.get("text", "") for b in blocks if isinstance(b, dict) and b.get("type") == "text").strip()
    payload = {"model": model, "messages": messages, "max_tokens": mt, "temperature": temp}
    headers = {"Content-Type": "application/json"}
    if key:
        headers["Authorization"] = "Bearer " + key
    req = Request(base + "/chat/completions", data=json.dumps(payload).encode(), method="POST", headers=headers)
    with urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read(400_000).decode("utf-8"))
    choices = data.get("choices") or []
    if not choices:
        raise ValueError("empty_response")
    return ((choices[0].get("message") or {}).get("content") or "").strip()


def now_local() -> str:
    return datetime.now().strftime("%Y-%m-%dT%H:%M")


def valid_stamp(text: str) -> bool:
    if not isinstance(text, str):
        return False
    try:
        datetime.strptime(text, "%Y-%m-%dT%H:%M")
        return True
    except ValueError:
        return False


def valid_day(text: str) -> bool:
    if not isinstance(text, str):
        return False
    try:
        date.fromisoformat(text)
        return True
    except ValueError:
        return False


def _to_number(raw):
    """Number from a form field: accepts dot or comma decimals ("36.5"/"36,5"),
    spaces as thousand separators and EU mixed forms ("1.234,5"). Raises ValueError on junk."""
    if isinstance(raw, bool):
        raise ValueError("bool is not a number")
    if isinstance(raw, (int, float)):
        return float(raw)
    s = str(raw).strip().replace("\u00a0", "").replace(" ", "")
    if "," in s and "." in s:  # the last separator is the decimal mark, the other one groups thousands
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    else:
        s = s.replace(",", ".")
    return float(s)


def clean_int(raw, field: str, errors: dict, maximum: int = 100000):
    if raw in (None, ""):
        return None
    try:
        value = int(_to_number(raw))
    except (TypeError, ValueError):
        errors[field] = "bad_number"
        return None
    if value < 0 or value > maximum:
        errors[field] = "out_of_range"
        return None
    return value


def clean_float(raw, field: str, errors: dict):
    if raw in (None, ""):
        return None
    try:
        value = _to_number(raw)
    except (TypeError, ValueError):
        errors[field] = "bad_number"
        return None
    if not -1000 <= value <= 100000:
        errors[field] = "out_of_range"
        return None
    return value


def clean_scale(raw, field: str, errors: dict):
    """Scale reading in grams: plausible infant/baby-scale band, 0.1 g precision."""
    if raw in (None, ""):
        return None
    value = clean_float(raw, field, errors)
    if value is None:
        return None
    if value < 100 or value > 30000:
        errors[field] = "out_of_range"
        return None
    return round(value, 1)


USER_MAX = 8


def clean_name(raw):
    """One caregiver name: short printable string with collapsed whitespace, or None."""
    if not isinstance(raw, str):
        return None
    name = " ".join(raw.split())
    if not (1 <= len(name) <= 24) or any(ord(c) < 32 for c in name):
        return None
    return name


def clean_users(raw):
    """Ordered unique caregiver names (max USER_MAX). Returns (users, error)."""
    if not isinstance(raw, list) or not raw:
        return None, "empty"
    out: list[str] = []
    for item in raw:
        name = clean_name(item)
        if name is None:
            return None, "bad_value"
        if name not in out:
            out.append(name)
    if not out:
        return None, "empty"
    if len(out) > USER_MAX:
        return None, "too_many"
    return out, None


def clean_birth_date(raw):
    """'' (= hide age) or a plausible ISO calendar date. Returns (birth_date, error)."""
    if raw in (None, ""):
        return "", None
    if not isinstance(raw, str):
        return None, "bad_date"
    try:
        d = date.fromisoformat(raw[:10])
    except ValueError:
        return None, "bad_date"
    if not (date(2000, 1, 1) <= d <= datetime.now().date() + timedelta(days=366)):
        return None, "out_of_range"
    return raw[:10], None


def clean_text(raw, limit: int = 2000):
    if raw is None:
        return None
    text = str(raw).strip()
    return text[:limit] or None


def parse_stamp(text):
    if not isinstance(text, str):
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            pass
    return None


def eff_minutes(at, end_at, pause_seconds=0, paused_at=None):
    """Wall-clock minutes between at and end_at minus paused intervals. An open-ended
    pause is counted up to end_at, so stopping while paused still subtracts it."""
    a = parse_stamp(at)
    b = parse_stamp(end_at) if end_at else None
    if not a or not b or b < a:
        return None
    secs = (b - a).total_seconds() - max(0, int(pause_seconds or 0))
    p = parse_stamp(paused_at) if paused_at else None
    if p:
        secs -= max(0.0, (b - p).total_seconds())
    minutes = int(secs // 60)
    return minutes if 0 <= minutes <= 24 * 60 else None


def validate(body: dict) -> tuple[dict | None, dict]:
    errors: dict = {}
    user = body.get("user")
    kind = body.get("kind")
    timer = bool(body.get("timer"))
    if user not in current_settings()["users"]:
        errors["user"] = "bad_value"
    if kind not in KINDS:
        errors["kind"] = "bad_value"
    if timer and kind not in TIMER_KINDS:
        errors["kind"] = "bad_value"
    at = body.get("at") or now_local()
    if not valid_stamp(at):
        errors["at"] = "bad_datetime"

    rec: dict = {"user": user, "kind": kind, "at": at, "timer": 1 if timer else 0}
    # walks are pausable by default; other timer kinds opt in via the tile flag
    rec["pausable"] = 1 if kind == "walk" or (timer and kind in TIMER_KINDS and bool(body.get("pausable"))) else 0

    if kind == "diaper":
        dtype = body.get("diaper_type")
        if dtype not in DIAPER_TYPES:
            errors["diaper_type"] = "bad_value"
        rec["diaper_type"] = dtype
        colour = body.get("diaper_colour")
        if colour is not None and colour not in DIAPER_COLOURS:
            errors["diaper_colour"] = "bad_value"
        rec["diaper_colour"] = colour
    elif kind == "feed":
        method = body.get("feed_method")
        if method in FEED_METHODS:
            rec["feed_method"] = method
        elif timer and (method is None or method == ""):
            rec["feed_method"] = None
        else:
            errors["feed_method"] = "bad_value"
        rec["feed_minutes"] = clean_int(body.get("feed_minutes"), "feed_minutes", errors, 600)
        rec["feed_ml"] = clean_int(body.get("feed_ml"), "feed_ml", errors, 1000)
        rec["swallows"] = clean_int(body.get("swallows"), "swallows", errors, 2000)
        rec["scale_before_g"] = clean_scale(body.get("scale_before_g"), "scale_before_g", errors)
        rec["scale_after_g"] = clean_scale(body.get("scale_after_g"), "scale_after_g", errors)
        end_at = body.get("end_at") or None
        rec["end_at"] = end_at
        if end_at is not None:
            if not valid_stamp(end_at):
                errors["end_at"] = "bad_datetime"
            elif "at" not in errors:
                minutes = minutes_between(at, end_at)
                if minutes is None:
                    errors["end_at"] = "before_start" if end_at < at else "out_of_range"
                elif rec.get("feed_minutes") is None:
                    rec["feed_minutes"] = minutes
        # derive the milk amount from a before/after weigh-in when no ml was supplied —
        # same 2–400 g plausibility band the dialog uses, so saving just the two
        # weights always yields the drank amount even from queued/offline submits
        if body.get("feed_ml") in (None, "") and rec["scale_before_g"] is not None and rec["scale_after_g"] is not None:
            diff = int(round(rec["scale_after_g"] - rec["scale_before_g"]))
            if 2 <= diff <= 400:
                rec["feed_ml"] = diff
    elif kind in ("sleep", "walk", "bath"):
        end_at = body.get("end_at") or None
        rec["end_at"] = end_at
        if end_at is not None:
            if not valid_stamp(end_at):
                errors["end_at"] = "bad_datetime"
            elif "at" not in errors:
                minutes = minutes_between(at, end_at)
                if minutes is None:
                    errors["end_at"] = "before_start" if end_at < at else "out_of_range"
    elif kind == "activity":
        activity = clean_text(body.get("activity"), 200)
        if not activity and not timer:
            errors["activity"] = "required"
        rec["activity"] = activity
        end_at = body.get("end_at") or None
        rec["end_at"] = end_at
        if end_at is not None:
            if not valid_stamp(end_at):
                errors["end_at"] = "bad_datetime"
            elif "at" not in errors:
                minutes = minutes_between(at, end_at)
                if minutes is None:
                    errors["end_at"] = "before_start" if end_at < at else "out_of_range"
    elif kind == "medication":
        med_name = clean_text(body.get("med_name"), 100)
        if not med_name:
            errors["med_name"] = "required"
        rec["med_name"] = med_name
        dose = clean_text(body.get("dose"), 100)
        rec["dose"] = dose
    elif kind == "measure":
        mk = body.get("measure_kind")
        if mk not in MEASURE_KINDS:
            errors["measure_kind"] = "bad_value"
        rec["measure_kind"] = mk
        rec["value"] = clean_float(body.get("value"), "value", errors)
    elif kind == "note":
        if not clean_text(body.get("note")):
            errors["note"] = "required"

    rec["note"] = clean_text(body.get("note"))
    rec = {k: v for k, v in rec.items() if v is not None}
    return (None if errors else rec), errors


def row_to_dict(row: sqlite3.Row) -> dict:
    return {f: row[f] for f in FIELDS}


def validate_update(body: dict, existing: sqlite3.Row) -> tuple[dict, dict]:
    kind = existing["kind"]
    updates: dict = {}
    errors: dict = {}

    if "user" in body:
        user = body.get("user")
        if user in current_settings()["users"]:
            updates["user"] = user
        elif user is None or user == "":
            errors["user"] = "required"
        else:
            errors["user"] = "bad_value"

    if "at" in body:
        at = body.get("at")
        if valid_stamp(at):
            updates["at"] = at
        else:
            errors["at"] = "bad_datetime"

    def enum_update(field: str, allowed: list[str], required: bool = False):
        if field not in body:
            return existing[field]
        raw = body[field]
        if raw is None or raw == "":
            if required:
                errors[field] = "required"
            else:
                updates[field] = None
            return existing[field] if required else None
        if raw in allowed:
            updates[field] = raw
            return raw
        errors[field] = "bad_value"
        return existing[field]

    def int_update(field: str, maximum: int):
        if field not in body:
            return existing[field]
        raw = body[field]
        if raw is None or raw == "":
            updates[field] = None
            return None
        value = clean_int(raw, field, errors, maximum)
        if value is not None:
            updates[field] = value
            return value
        return existing[field]

    def note_update(required: bool = False):
        if "note" not in body:
            return existing["note"]
        text = clean_text(body.get("note"))
        if not text:
            if required:
                errors["note"] = "required"
            else:
                updates["note"] = None
            return existing["note"] if required else None
        updates["note"] = text
        return text

    def stamp_update(field: str):
        if field not in body:
            return existing[field]
        raw = body.get(field)
        if raw is None or raw == "":
            updates[field] = None
            return None
        if valid_stamp(raw):
            updates[field] = raw
            return raw
        errors[field] = "bad_datetime"
        return existing[field]

    def text_update(field: str, limit: int = 200, required: bool = False):
        if field not in body:
            return existing[field]
        text = clean_text(body.get(field), limit)
        if not text:
            if required:
                errors[field] = "required"
            else:
                updates[field] = None
            return existing[field] if required else None
        updates[field] = text
        return text

    def validate_interval():
        if "at" in errors or "end_at" in errors:
            return
        final_at = updates.get("at", existing["at"])
        final_end = updates.get("end_at", existing["end_at"])
        if final_end is None:
            return
        minutes = minutes_between(final_at, final_end)
        if minutes is None:
            errors["end_at"] = "before_start" if final_end < final_at else "out_of_range"

    if kind == "diaper":
        enum_update("diaper_type", DIAPER_TYPES, True)
        enum_update("diaper_colour", DIAPER_COLOURS)
        note_update()
    elif kind == "feed":
        enum_update("feed_method", FEED_METHODS, False)
        int_update("feed_minutes", 600)
        int_update("feed_ml", 1000)
        int_update("swallows", 2000)

        def scale_update(field: str):
            if field not in body:
                return
            raw = body[field]
            if raw is None or raw == "":
                updates[field] = None
                return
            value = clean_scale(raw, field, errors)
            if value is not None:
                updates[field] = value

        scale_update("scale_before_g")
        scale_update("scale_after_g")
        # once both weigh-ins are in and no ml is set, fill in the derived milk amount
        final_before = updates.get("scale_before_g", existing["scale_before_g"])
        final_after = updates.get("scale_after_g", existing["scale_after_g"])
        if (updates.get("feed_ml", existing["feed_ml"]) is None and "feed_ml" not in errors
                and final_before is not None and final_after is not None):
            diff = int(round(final_after - final_before))
            if 2 <= diff <= 400:
                updates["feed_ml"] = diff
        stamp_update("end_at")
        validate_interval()
        final_end = updates.get("end_at", existing["end_at"])
        if "end_at" not in errors and final_end is not None:
            minutes = eff_minutes(updates.get("at", existing["at"]), final_end,
                                  existing["pause_seconds"], existing["paused_at"])
            if minutes is not None and existing["feed_minutes"] is None and "feed_minutes" not in updates:
                updates["feed_minutes"] = minutes
        note_update()
    elif kind in ("sleep", "walk", "bath"):
        stamp_update("end_at")
        validate_interval()
        note_update()
    elif kind == "activity":
        text_update("activity", 200, required=existing["timer"] != 1)
        stamp_update("end_at")
        validate_interval()
        note_update()
    elif kind == "medication":
        text_update("med_name", 100, required=True)
        text_update("dose", 100)
        note_update()
    elif kind == "measure":
        enum_update("measure_kind", MEASURE_KINDS, True)
        if "value" in body:
            raw = body.get("value")
            if raw is None or raw == "":
                errors["value"] = "required"
            else:
                value = clean_float(raw, "value", errors)
                if value is not None:
                    updates["value"] = value
        note_update()
    elif kind == "note":
        note_update(True)

    return updates, errors


def task_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    try:
        d["days"] = json.loads(d.get("days") or "[]")
    except Exception:
        d["days"] = []
    try:
        d["times"] = json.loads(d.get("times") or "[]")
    except Exception:
        d["times"] = []
    d["active"] = bool(d.get("active", 1))
    return d


def clean_time(raw) -> str | None:
    if not isinstance(raw, str):
        return None
    try:
        dt = datetime.strptime(raw[:5], "%H:%M")
        return dt.strftime("%H:%M")
    except ValueError:
        return None


def validate_task(body: dict) -> tuple[dict | None, dict]:
    errors: dict[str, str] = {}
    title = clean_text(body.get("title"), 120)
    if not title:
        errors["title"] = "required"
    detail = clean_text(body.get("detail"), 500)
    repeat = body.get("repeat") if body.get("repeat") in TASK_REPEATS else "daily"
    days = body.get("days") if isinstance(body.get("days"), list) else []
    days = sorted({int(x) for x in days if isinstance(x, int) and 0 <= int(x) <= 6})
    raw_times = body.get("times") if isinstance(body.get("times"), list) else []
    times = sorted({t for t in (clean_time(x) for x in raw_times) if t})
    if not times:
        start = clean_time(body.get("start_time")) or "08:00"
        interval = clean_int(body.get("interval_minutes"), "interval_minutes", errors, 1440) or 240
        count = clean_int(body.get("times_per_day"), "times_per_day", errors, 12) or 1
        if interval < 15:
            errors["interval_minutes"] = "out_of_range"
        if count < 1:
            errors["times_per_day"] = "out_of_range"
        if not errors:
            start_dt = datetime.strptime(start, "%H:%M")
            for i in range(count):
                t = (start_dt + timedelta(minutes=interval * i)).strftime("%H:%M")
                if t not in times:
                    times.append(t)
            times = sorted(times)
    icon = body.get("icon") if body.get("icon") in TASK_ICONS else "bell"
    color = body.get("color") if isinstance(body.get("color"), str) and re.match(r"^#[0-9a-fA-F]{6}$", body.get("color")) else TASK_COLORS[0]
    active = 1 if body.get("active", True) else 0
    start_date = body.get("start_date") if valid_day(body.get("start_date", "")) else None
    end_date = body.get("end_date") if valid_day(body.get("end_date", "")) else None
    duration = clean_int(body.get("duration_minutes"), "duration_minutes", errors, 180) or 15
    if duration < 5:
        errors["duration_minutes"] = "out_of_range"
    if errors:
        return None, errors
    rec = {
        "title": title, "detail": detail, "repeat": repeat, "days": json.dumps(days),
        "times": json.dumps(times), "icon": icon, "color": color, "active": active,
        "start_date": start_date, "end_date": end_date,
        "interval_minutes": clean_int(body.get("interval_minutes"), "interval_minutes", {}, 1440),
        "times_per_day": clean_int(body.get("times_per_day"), "times_per_day", {}, 12),
        "duration_minutes": duration,
    }
    return rec, {}


class Handler(BaseHTTPRequestHandler):
    server_version = f"babylog/{VERSION}"

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s %s\n" % (self.log_date_time_string(), fmt % args))

    def _send(self, status: int, body: bytes, ctype: str, extra: dict | None = None) -> None:
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _json(self, status: int, payload) -> None:
        self._send(status, json.dumps(payload, ensure_ascii=False).encode(), "application/json; charset=utf-8")

    def _read_json(self, max_body: int = MAX_BODY) -> tuple[dict | None, str | None]:
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return None, "empty_body"
        if length > max_body:
            return None, "too_large"
        try:
            body = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None, "bad_json"
        if not isinstance(body, dict):
            return None, "bad_json"
        return body, None

    def _static(self, path: str) -> None:
        rel = path[len("/static/"):]
        full = os.path.normpath(os.path.join(STATIC, rel))
        if not full.startswith(STATIC + os.sep) or not os.path.isfile(full):
            self._json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
            return
        ext = os.path.splitext(full)[1]
        with open(full, "rb") as fh:
            self._send(HTTPStatus.OK, fh.read(), TYPES.get(ext, "application/octet-stream"))

    def _query(self) -> dict:
        return {k: v[0] for k, v in parse_qs(urlparse(self.path).query).items()}

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/healthz":
            self._json(HTTPStatus.OK, {"ok": True, "version": VERSION, "db": os.path.isfile(DB)})
        elif path == "/":
            with open(os.path.join(STATIC, "index.html"), "rb") as fh:
                self._send(HTTPStatus.OK, fh.read(), TYPES[".html"])
        elif path.startswith("/static/"):
            self._static(path)
        elif path == "/sw.js":
            with open(os.path.join(STATIC, "sw.js"), "rb") as fh:
                self._send(HTTPStatus.OK, fh.read(), TYPES[".js"])
        elif path == "/api/meta":
            cfg = current_settings()
            age = ""
            try:
                age = str((datetime.now().date() - date.fromisoformat(cfg["birth_date"])).days)
            except ValueError:
                pass
            with db() as conn:
                has_entries = conn.execute("SELECT EXISTS(SELECT 1 FROM entries LIMIT 1)").fetchone()[0]
            self._json(HTTPStatus.OK, {
                "users": cfg["users"], "kinds": KINDS, "diaper_types": DIAPER_TYPES,
                "diaper_colours": DIAPER_COLOURS, "feed_methods": FEED_METHODS,
                "measure_kinds": MEASURE_KINDS, "birth_date": cfg["birth_date"],
                "age_days": age, "server_time": now_local(), "version": VERSION,
                "setup_needed": bool(not cfg["configured"] and not has_entries),
            })
        elif path == "/api/settings":
            cfg = current_settings()
            self._json(HTTPStatus.OK, {"settings": cfg})
        elif path == "/api/entries":
            self._entries()
        elif re.match(r"^/api/entries/\d+/photos$", path):
            entry_id = int(path.split("/")[3])
            with db() as conn:
                row = conn.execute("SELECT photo_a, photo_b FROM entries WHERE id=?", (entry_id,)).fetchone()
            if not row:
                self._json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
            else:
                self._json(HTTPStatus.OK, {"photo_a": row["photo_a"], "photo_b": row["photo_b"]})
        elif path == "/api/summary":
            self._summary()
        elif path == "/api/tasks":
            self._tasks()
        elif path == "/api/llm":
            self._json(HTTPStatus.OK, {"llm": llm_public(llm_load())})
        elif path == "/api/task_checkins":
            self._task_checkins()
        elif path == "/calendar.ics":
            self._calendar()
        elif path == "/export.csv":
            self._csv()
        elif path == "/ca.crt" and CA_CERT and os.path.isfile(CA_CERT):
            with open(CA_CERT, "rb") as fh:
                self._send(HTTPStatus.OK, fh.read(), TYPES[".crt"],
                           {"Content-Disposition": 'attachment; filename="babylog-ca.crt"'})
        else:
            self._json(HTTPStatus.NOT_FOUND, {"error": "not_found"})

    def _filtered(self) -> tuple[list, dict]:
        q = self._query()
        where, args = [], []
        if valid_day(q.get("from", "")):
            where.append("at >= ?")
            args.append(q["from"] + "T00:00")
        if valid_day(q.get("to", "")):
            where.append("at <= ?")
            args.append(q["to"] + "T23:59")
        if q.get("user") in current_settings()["users"]:
            where.append("user = ?")
            args.append(q["user"])
        if q.get("kind") in KINDS:
            where.append("kind = ?")
            args.append(q["kind"])
        limit = clean_int(q.get("limit"), "limit", {}, 5000) or 500
        sql = "SELECT * FROM entries"
        if where:
            sql += " WHERE " + " AND ".join(where)
        sql += " ORDER BY at DESC, id DESC LIMIT ?"
        args.append(limit)
        with db() as conn:
            rows = conn.execute(sql, args).fetchall()
        return [row_to_dict(r) for r in rows], q

    def _entries(self) -> None:
        rows, _ = self._filtered()
        self._json(HTTPStatus.OK, {"entries": rows})

    def _csv(self) -> None:
        rows, _ = self._filtered()
        rows.reverse()
        out = [",".join(FIELDS)]
        for row in rows:
            cells = []
            for field in FIELDS:
                value = row.get(field)
                text = "" if value is None else str(value)
                if any(c in text for c in (",", '"', "\n")):
                    text = '"' + text.replace('"', '""') + '"'
                cells.append(text)
            out.append(",".join(cells))
        body = ("\r\n".join(out) + "\r\n").encode("utf-8")
        self._send(HTTPStatus.OK, body, TYPES[".csv"], {"Content-Disposition": 'attachment; filename="baby-log.csv"'})

    def _summary(self) -> None:
        days = clean_int(self._query().get("days"), "days", {}, 60) or 7
        today = datetime.now().date()
        start = (today - timedelta(days=days - 1)).isoformat()
        with db() as conn:
            rows = [row_to_dict(r) for r in conn.execute(
                "SELECT * FROM entries WHERE at >= ? ORDER BY at ASC", (start + "T00:00",)
            ).fetchall()]
        per_day: dict[str, dict] = {}
        weights = []
        for offset in range(days - 1, -1, -1):
            day = (today - timedelta(days=offset)).isoformat()
            per_day[day] = {"date": day, "wet": 0, "dirty": 0, "mixed": 0, "nappies": 0,
                            "feeds": 0, "feed_minutes": 0, "feed_ml": 0, "sleep_minutes": 0,
                            "walks": 0, "walk_minutes": 0, "baths": 0, "bath_minutes": 0,
                            "medications": 0, "activities": 0, "activity_minutes": 0,
                            "notes": 0, "weight_g": None, "temp_c": None, "swallows": None,
                            "entry_count": 0, "first_at": None, "last_at": None}
        for row in rows:
            day = row["at"][:10]
            bucket = per_day.get(day)
            if not bucket:
                continue
            bucket["entry_count"] += 1
            if bucket["first_at"] is None or row["at"] < bucket["first_at"]:
                bucket["first_at"] = row["at"]
            if bucket["last_at"] is None or row["at"] > bucket["last_at"]:
                bucket["last_at"] = row["at"]
            kind = row["kind"]
            if kind == "diaper":
                dtype = row["diaper_type"]
                if dtype in ("wet", "dirty", "mixed"):
                    bucket[dtype] += 1
                bucket["nappies"] += 1
            elif kind == "feed":
                if row.get("timer") == 1 and not row["end_at"]:
                    continue
                bucket["feeds"] += 1
                bucket["feed_minutes"] += row["feed_minutes"] or 0
                bucket["feed_ml"] += row["feed_ml"] or 0
                if row["swallows"] is not None:
                    bucket["swallows"] = (bucket["swallows"] or 0) + row["swallows"]
            elif kind == "sleep":
                minutes = eff_minutes(row["at"], row["end_at"], row.get("pause_seconds") or 0, row.get("paused_at"))
                if minutes is not None:
                    bucket["sleep_minutes"] += minutes
            elif kind == "walk":
                if row.get("timer") == 1 and not row["end_at"]:
                    continue
                bucket["walks"] += 1
                minutes = eff_minutes(row["at"], row["end_at"], row.get("pause_seconds") or 0, row.get("paused_at"))
                if minutes is not None:
                    bucket["walk_minutes"] += minutes
            elif kind == "bath":
                if row.get("timer") == 1 and not row["end_at"]:
                    continue
                bucket["baths"] += 1
                minutes = eff_minutes(row["at"], row["end_at"], row.get("pause_seconds") or 0, row.get("paused_at"))
                if minutes is not None:
                    bucket["bath_minutes"] += minutes
            elif kind == "medication":
                bucket["medications"] += 1
            elif kind == "activity":
                if row.get("timer") == 1 and not row["end_at"]:
                    continue
                bucket["activities"] += 1
                minutes = eff_minutes(row["at"], row["end_at"], row.get("pause_seconds") or 0, row.get("paused_at"))
                if minutes is not None:
                    bucket["activity_minutes"] += minutes
            elif kind == "measure":
                if row["measure_kind"] == "weight_g" and row["value"] is not None:
                    bucket["weight_g"] = row["value"]
                    weights.append({"date": day, "value": row["value"]})
                elif row["measure_kind"] == "temp_c" and row["value"] is not None:
                    bucket["temp_c"] = row["value"]
            elif kind == "note":
                bucket["notes"] += 1
        today_key = today.isoformat()
        self._json(HTTPStatus.OK, {
            "days": [per_day[d] for d in per_day],
            "today": per_day.get(today_key),
            "weights": weights,
            "open_logs": sorted(
                (row for row in rows if row["end_at"] is None and (row.get("timer") == 1 or row["kind"] == "sleep")),
                key=lambda row: row["at"],
                reverse=True,
            ),
            "open_sleep": next((row for row in rows if row["kind"] == "sleep" and not row["end_at"]), None),
        })

    def _tasks(self) -> None:
        with db() as conn:
            rows = conn.execute("SELECT * FROM tasks ORDER BY active DESC, id ASC").fetchall()
        self._json(HTTPStatus.OK, {"tasks": [task_to_dict(r) for r in rows]})

    def _task_checkins(self) -> None:
        q = self._query()
        where, args = [], []
        if valid_day(q.get("from", "")):
            where.append("scheduled_at >= ?")
            args.append(q["from"] + "T00:00")
        if valid_day(q.get("to", "")):
            where.append("scheduled_at <= ?")
            args.append(q["to"] + "T23:59")
        sql = "SELECT * FROM task_checkins"
        if where:
            sql += " WHERE " + " AND ".join(where)
        sql += " ORDER BY scheduled_at DESC LIMIT 5000"
        with db() as conn:
            rows = conn.execute(sql, args).fetchall()
        self._json(HTTPStatus.OK, {"checkins": [dict(r) for r in rows]})

    def _calendar(self) -> None:
        with db() as conn:
            tasks = conn.execute("SELECT * FROM tasks WHERE active=1 ORDER BY id").fetchall()
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//baby-log//Tasks//SK", "CALSCALE:GREGORIAN",
               "METHOD:PUBLISH", "X-WR-CALNAME:Baby tasks", "X-WR-TIMEZONE:Europe/Bratislava",
               "BEGIN:VTIMEZONE", "TZID:Europe/Bratislava",
               "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST",
               "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
               "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET",
               "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
               "END:VTIMEZONE"]
        for row in tasks:
            task = task_to_dict(row)
            duration = int(task.get("duration_minutes") or 15)
            rrule = {"daily": "FREQ=DAILY", "weekly": "FREQ=WEEKLY", "monthly": "FREQ=MONTHLY"}.get(task["repeat"], "FREQ=DAILY")
            if task["repeat"] == "weekly" and task.get("days"):
                names = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]
                rrule += ";BYDAY=" + ",".join(names[d] for d in task["days"])
            if task["repeat"] == "monthly" and task.get("start_date"):
                rrule += f";BYMONTHDAY={int(task['start_date'][8:10])}"
            if task.get("end_date"):
                rrule += f";UNTIL={task['end_date'].replace('-', '')}T235900"
            for time in task.get("times") or ["08:00"]:
                start_date = task.get("start_date") or datetime.now().date().isoformat()
                dtstart = f"{start_date.replace('-', '')}T{time.replace(':', '')}00"
                start_dt = datetime.strptime(f"{start_date}T{time}", "%Y-%m-%dT%H:%M")
                dtend = (start_dt + timedelta(minutes=duration)).strftime("%Y%m%dT%H%M%S")
                uid = f"baby-task-{row['id']}-{time.replace(':', '')}@baby-log"
                summary = task["title"]
                desc = task.get("detail") or ""
                out += ["BEGIN:VEVENT", f"UID:{uid}", f"DTSTAMP:{stamp}", f"DTSTART;TZID=Europe/Bratislava:{dtstart}", f"DTEND;TZID=Europe/Bratislava:{dtend}",
                        f"SUMMARY:{summary}", f"DESCRIPTION:{desc}", f"RRULE:{rrule}",
                        "BEGIN:VALARM", "ACTION:DISPLAY", f"DESCRIPTION:{summary}", "TRIGGER:-PT15M", "END:VALARM",
                        "END:VEVENT"]
        out.append("END:VCALENDAR")
        body = "\r\n".join(out).encode("utf-8")
        self._send(HTTPStatus.OK, body, "text/calendar; charset=utf-8",
                   {"Content-Disposition": 'attachment; filename="baby-tasks.ics"'})

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/llm":
            body, err = self._read_json()
            if err:
                self._json(HTTPStatus.BAD_REQUEST, {"errors": {"body": err}})
                return
            cfg = llm_load()
            for k in ("provider", "base_url", "model"):
                if isinstance(body.get(k), str):
                    cfg[k] = body[k].strip()[:200]
            if cfg["provider"] not in LLM_PROVIDERS:
                cfg["provider"] = "off"
            if isinstance(body.get("api_key"), str):
                cfg["api_key"] = body["api_key"].strip()[:400]
            for k, lo, hi in (("max_tokens", 64, 4096), ("temperature", 0.0, 1.0)):
                v = body.get(k)
                if isinstance(v, (int, float)) and not isinstance(v, bool) and lo <= v <= hi:
                    cfg[k] = v
            llm_save(cfg)
            self._json(HTTPStatus.OK, {"llm": llm_public(cfg)})
        elif path == "/api/llm/test":
            cfg = llm_load()
            t0 = time.time()
            try:
                reply = llm_call(cfg, [{"role": "user", "content": "Reply with exactly: OK"}], timeout=llm_timeout(cfg, "test"))
                self._json(HTTPStatus.OK, {"ok": True, "reply": reply[:200], "ms": int((time.time() - t0) * 1000)})
            except Exception as exc:  # noqa: BLE001 - surface config errors to the settings UI
                self._json(HTTPStatus.OK, {"ok": False, "error": f"{type(exc).__name__}: {exc}"[:200]})
        elif path == "/api/llm/detect":
            found = []
            try:
                with urlopen(Request("http://localhost:11434/api/tags", method="GET"), timeout=2) as resp:
                    data = json.loads(resp.read(200_000).decode("utf-8"))
                found = [m.get("name") for m in data.get("models", []) if isinstance(m, dict) and m.get("name")][:40]
            except Exception:  # noqa: BLE001 - detection is best-effort
                pass
            self._json(HTTPStatus.OK, {"found": found, "base_url": "http://localhost:11434/v1"})
        elif path == "/api/llm/models":
            # Pull the model list from an endpoint (body overrides take precedence over saved config),
            # so the settings UI can offer a dropdown before anything is generated for the first time.
            body, _ = self._read_json()
            body = body if isinstance(body, dict) else {}
            cfg = llm_load()
            provider = body.get("provider")
            if not isinstance(provider, str) or provider not in LLM_PROVIDERS:
                provider = cfg["provider"]
            base_in = body.get("base_url")
            base = (base_in.strip() if isinstance(base_in, str) and base_in.strip() else cfg["base_url"]).strip().rstrip("/")[:200]
            key_in = body.get("api_key")
            key = key_in.strip()[:400] if isinstance(key_in, str) and key_in.strip() else (cfg.get("api_key") or "")

            def pull(url: str, headers: dict) -> list:
                with urlopen(Request(url, method="GET", headers=headers), timeout=12) as resp:
                    data = json.loads(resp.read(600_000).decode("utf-8"))
                items = data.get("data") if isinstance(data, dict) else None  # OpenAI-style {"data": [...]}
                if not isinstance(items, list) and isinstance(data, dict):
                    items = data.get("models")  # Ollama-style {"models": [...]}
                out = []
                for m in items or []:
                    mid = (m.get("id") or m.get("name")) if isinstance(m, dict) else (m if isinstance(m, str) else None)
                    if isinstance(mid, str) and mid and mid not in out:
                        out.append(mid)
                return out[:100]

            models = []
            error = ""
            try:
                if provider == "anthropic":
                    models = pull((base or "https://api.anthropic.com") + "/v1/models",
                                  {"x-api-key": key, "anthropic-version": "2023-06-01"})
                else:
                    if not base:
                        raise ValueError("not_configured")
                    models = pull(base + "/models", ({"Authorization": "Bearer " + key} if key else {}))
                if not models and provider != "anthropic" and base.endswith("/v1"):
                    try:  # Ollama exposes /api/tags at the root; some builds return an empty OpenAI list
                        models = pull(base[:-3].rstrip("/") + "/api/tags", {})
                    except Exception:  # noqa: BLE001 - fallback lookup is best-effort
                        pass
            except Exception as exc:  # noqa: BLE001 - surface connection errors to the settings UI
                error = f"{type(exc).__name__}: {exc}"[:200]
            self._json(HTTPStatus.OK, {"ok": not error, "models": models, "error": error})
        elif path == "/api/llm/chat":
            body, err = self._read_json(max_body=64_000)
            msgs_in = body.get("messages") if isinstance(body, dict) else None
            if err or not isinstance(msgs_in, list) or not 1 <= len(msgs_in) <= 25:
                self._json(HTTPStatus.BAD_REQUEST, {"errors": {"body": err or "bad_messages"}})
                return
            msgs = []
            for m in msgs_in:
                if not isinstance(m, dict) or m.get("role") not in ("system", "user", "assistant") \
                        or not isinstance(m.get("content"), str) or len(m["content"]) > 8000:
                    self._json(HTTPStatus.BAD_REQUEST, {"errors": {"body": "bad_messages"}})
                    return
                msgs.append({"role": m["role"], "content": m["content"]})
            cfg = llm_load()
            if cfg["provider"] == "off":
                self._json(HTTPStatus.BAD_REQUEST, {"error": "disabled"})
                return
            try:
                reply = llm_call(cfg, msgs, timeout=llm_timeout(cfg, "chat"))
                self._json(HTTPStatus.OK, {"reply": reply[:6000]})
            except Exception as exc:  # noqa: BLE001
                self._json(HTTPStatus.BAD_REQUEST, {"error": f"{type(exc).__name__}: {exc}"[:200]})
        elif path == "/api/llm/scale":
            # vision-model reading of a scale photo — the fallback when the phone's on-device
            # seven-segment reader can't decode the display (client offers this only if an LLM is set up)
            body, err = self._read_json(MAX_BODY_PHOTO)
            if err:
                self._json(HTTPStatus.BAD_REQUEST, {"error": err})
                return
            img_re = re.compile(r"^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$")
            image = str((body or {}).get("image") or "")
            if not img_re.match(image):
                self._json(HTTPStatus.BAD_REQUEST, {"error": "bad_image"})
                return
            rots = body.get("image_rots")
            rots = [str(r) for r in rots if isinstance(r, str) and img_re.match(r)][:2] if isinstance(rots, list) else []
            cfg = llm_load()
            if cfg["provider"] == "off" or not cfg.get("model"):
                self._json(HTTPStatus.BAD_REQUEST, {"error": "not_configured"})
                return
            parts = [{"type": "text", "text": SCALE_PROMPT_2 if rots else SCALE_PROMPT},
                     {"type": "image_url", "image_url": {"url": image}}]
            for r in rots:
                parts.append({"type": "image_url", "image_url": {"url": r}})
            msgs = [{"role": "user", "content": parts}]
            try:
                # thinking models burn most of the budget in reasoning_content before answering;
                # temp 0 because seven-segment reads are borderline and sampling drops digits
                reply = llm_call(cfg, msgs, timeout=llm_timeout(cfg, "chat"), max_tokens=1400, temperature=0)
            except Exception as exc:  # noqa: BLE001
                self._json(HTTPStatus.BAD_REQUEST, {"error": f"{type(exc).__name__}: {exc}"[:200]})
                return
            value = None
            dec = re.search(r"\d{1,3}[.,]\d{1,3}", reply)
            if dec:
                value = float(dec.group(0).replace(",", "."))
            else:
                whole = re.search(r"\d+", reply)
                if whole and not reply.lower().startswith("none"):
                    v = float(whole.group(0))
                    value = v / 1000 if v >= 50 else v  # gram-style display ("3973") -> kg
            if value is not None and not (0.02 <= value <= 40):
                value = None
            self._json(HTTPStatus.OK, {"value": round(value, 3) if value is not None else None, "text": reply[:80]})
        elif path == "/api/settings":
            body, err = self._read_json()
            if err:
                self._json(HTTPStatus.BAD_REQUEST, {"errors": {"body": err}})
                return
            cfg = current_settings()
            users, birth, errors = cfg["users"], cfg["birth_date"], {}
            if "users" in body:
                users, e = clean_users(body.get("users"))
                if e:
                    errors["users"] = e
            if "birth_date" in body:
                birth, e = clean_birth_date(body.get("birth_date"))
                if e:
                    errors["birth_date"] = e
            renames: list[dict] = []
            raw_renames = body.get("renames") or []
            if not isinstance(raw_renames, list):
                errors["renames"] = "bad_value"
            else:
                for r in raw_renames:
                    src, dst = (clean_name(r.get("from")), clean_name(r.get("to"))) if isinstance(r, dict) else (None, None)
                    if not src or not dst or src == dst:
                        errors["renames"] = "bad_value"
                        continue
                    renames.append({"from": src, "to": dst})
            if errors:
                self._json(HTTPStatus.BAD_REQUEST, {"errors": errors})
                return
            with LOCK, db() as conn:
                for r in renames:  # keep history readable under the new label
                    conn.execute("UPDATE entries SET user=? WHERE user=?", (r["to"], r["from"]))
                    conn.execute("UPDATE task_checkins SET user=? WHERE user=?", (r["to"], r["from"]))
                conn.execute(
                    "INSERT INTO settings(key, value) VALUES('users', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                    (json.dumps(users, ensure_ascii=False),),
                )
                conn.execute(
                    "INSERT INTO settings(key, value) VALUES('birth_date', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                    (birth,),
                )
            self._json(HTTPStatus.OK, {"settings": {"users": users, "birth_date": birth, "configured": True}})
            return
        elif path == "/api/tasks":
            body, err = self._read_json()
            if err:
                self._json(HTTPStatus.BAD_REQUEST, {"errors": {"body": err}})
                return
            rec, errors = validate_task(body)
            if errors:
                self._json(HTTPStatus.BAD_REQUEST, {"errors": errors})
                return
            with LOCK, db() as conn:
                cur = conn.execute(
                    "INSERT INTO tasks(title,detail,repeat,days,times,icon,color,active,start_date,end_date,interval_minutes,times_per_day,duration_minutes,created) VALUES(%s)"
                    % ",".join("?" * 14),
                    [rec["title"], rec["detail"], rec["repeat"], rec["days"], rec["times"], rec["icon"], rec["color"], rec["active"],
                     rec["start_date"], rec["end_date"], rec["interval_minutes"], rec["times_per_day"], rec["duration_minutes"], now_local()],
                )
                row = conn.execute("SELECT * FROM tasks WHERE id=?", (cur.lastrowid,)).fetchone()
            self._json(HTTPStatus.CREATED, {"task": task_to_dict(row)})
            return
        if path == "/api/task_checkins":
            body, err = self._read_json()
            if err:
                self._json(HTTPStatus.BAD_REQUEST, {"errors": {"body": err}})
                return
            task_id = clean_int(body.get("task_id"), "task_id", {}, 100000)
            scheduled_at = body.get("scheduled_at")
            status = body.get("status") if body.get("status") in ("done", "skipped", "pending") else "done"
            who = body.get("user") if body.get("user") in current_settings()["users"] else None
            note = clean_text(body.get("note"), 500)
            if not task_id or not valid_stamp(scheduled_at):
                self._json(HTTPStatus.BAD_REQUEST, {"errors": {"task_id": "required", "scheduled_at": "bad_datetime"}})
                return
            with LOCK, db() as conn:
                task = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
                if not task:
                    self._json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
                    return
                existing = conn.execute("SELECT * FROM task_checkins WHERE task_id=? AND scheduled_at=?", (task_id, scheduled_at)).fetchone()
                if status == "pending":
                    if existing and existing["entry_id"]:
                        conn.execute("DELETE FROM entries WHERE id=?", (existing["entry_id"],))
                    conn.execute("DELETE FROM task_checkins WHERE task_id=? AND scheduled_at=?", (task_id, scheduled_at))
                    self._json(HTTPStatus.OK, {"checkin": None})
                    return
                entry_id = existing["entry_id"] if existing else None
                if status == "done" and not entry_id:
                    cur = conn.execute(
                        "INSERT INTO entries(user,kind,at,created,activity,task_id) VALUES(?,?,?,?,?,?)",
                        (who or "others", "task", now_local(), now_local(), task["title"], task_id),
                    )
                    entry_id = cur.lastrowid
                if entry_id and existing and existing["status"] == "done" and status != "done":
                    conn.execute("DELETE FROM entries WHERE id=?", (entry_id,))
                    entry_id = None
                conn.execute(
                    """INSERT INTO task_checkins(task_id,scheduled_at,status,user,note,entry_id,created)
                       VALUES(?,?,?,?,?,?,?)
                       ON CONFLICT(task_id,scheduled_at) DO UPDATE SET status=excluded.status,user=excluded.user,note=excluded.note,entry_id=excluded.entry_id""",
                    (task_id, scheduled_at, status, who, note, entry_id, now_local()),
                )
                row = conn.execute("SELECT * FROM task_checkins WHERE task_id=? AND scheduled_at=?", (task_id, scheduled_at)).fetchone()
            self._json(HTTPStatus.OK, {"checkin": dict(row)})
            return
        m = re.match(r"^/api/entries/(\d+)/photo$", urlparse(self.path).path)
        if m:
            entry_id = int(m.group(1))
            body, err = self._read_json(MAX_BODY_PHOTO)
            if err:
                self._json(HTTPStatus.BAD_REQUEST, {"errors": {"body": err}})
                return
            slot = body.get("slot")
            data = body.get("data")
            if slot not in ("a", "b"):
                self._json(HTTPStatus.BAD_REQUEST, {"errors": {"slot": "bad_value"}})
                return
            if data not in (None, "") and not re.match(r"^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$", str(data)):
                self._json(HTTPStatus.BAD_REQUEST, {"errors": {"data": "bad_value"}})
                return
            with LOCK, db() as conn:
                if not conn.execute("SELECT id FROM entries WHERE id=?", (entry_id,)).fetchone():
                    self._json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
                    return
                conn.execute(f"UPDATE entries SET photo_{slot}=?, updated=? WHERE id=?", (data or None, now_local(), entry_id))
            self._json(HTTPStatus.OK, {"ok": True, "slot": slot})
            return
        m = re.match(r"^/api/entries/(\d+)/(pause|resume)$", urlparse(self.path).path)
        if m:
            entry_id, action = int(m.group(1)), m.group(2)
            with LOCK, db() as conn:
                row = conn.execute("SELECT * FROM entries WHERE id=?", (entry_id,)).fetchone()
                if not row:
                    self._json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
                    return
                r = dict(row)
                if r.get("timer") != 1 or r.get("end_at"):
                    self._json(HTTPStatus.BAD_REQUEST, {"error": "not_open"})
                    return
                if not r.get("pausable"):
                    self._json(HTTPStatus.BAD_REQUEST, {"error": "not_pausable"})
                    return
                now = datetime.now()
                if action == "pause":
                    if not r.get("paused_at"):
                        conn.execute("UPDATE entries SET paused_at=?, updated=? WHERE id=?",
                                     (now.strftime("%Y-%m-%dT%H:%M:%S"), now_local(), entry_id))
                else:
                    p = parse_stamp(r.get("paused_at"))
                    if p:
                        added = max(0, int((now - p).total_seconds()))
                        conn.execute("UPDATE entries SET pause_seconds=?, paused_at=NULL, updated=? WHERE id=?",
                                     ((r.get("pause_seconds") or 0) + added, now_local(), entry_id))
                row = conn.execute("SELECT * FROM entries WHERE id=?", (entry_id,)).fetchone()
            self._json(HTTPStatus.OK, {"entry": row_to_dict(row)})
            return
        if path != "/api/entries":
            self._json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
            return
        body, err = self._read_json()
        if err:
            self._json(HTTPStatus.BAD_REQUEST, {"errors": {"body": err}})
            return
        rec, errors = validate(body)
        if errors:
            self._json(HTTPStatus.BAD_REQUEST, {"errors": errors})
            return
        with LOCK, db() as conn:
            columns = list(rec.keys()) + ["created"]
            values = list(rec.values()) + [now_local()]
            cur = conn.execute(
                "INSERT INTO entries(%s) VALUES(%s)" % (",".join(columns), ",".join("?" * len(columns))),
                values,
            )
            row = conn.execute("SELECT * FROM entries WHERE id=?", (cur.lastrowid,)).fetchone()
        self._json(HTTPStatus.CREATED, {"entry": row_to_dict(row)})

    def do_PUT(self) -> None:
        m = re.match(r"^/api/tasks/(\d+)$", urlparse(self.path).path)
        if m:
            task_id = int(m.group(1))
            body, err = self._read_json()
            if err:
                self._json(HTTPStatus.BAD_REQUEST, {"errors": {"body": err}})
                return
            with LOCK, db() as conn:
                existing = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
                if not existing:
                    self._json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
                    return
                merged = dict(existing)
                for key in ("title", "detail", "repeat", "days", "times", "icon", "color", "active", "start_date", "end_date", "interval_minutes", "times_per_day", "duration_minutes"):
                    if key in body:
                        merged[key] = body[key]
                rec, errors = validate_task(merged)
                if errors:
                    self._json(HTTPStatus.BAD_REQUEST, {"errors": errors})
                    return
                conn.execute(
                    "UPDATE tasks SET title=?,detail=?,repeat=?,days=?,times=?,icon=?,color=?,active=?,start_date=?,end_date=?,interval_minutes=?,times_per_day=?,duration_minutes=?,updated=? WHERE id=?",
                    [rec["title"], rec["detail"], rec["repeat"], rec["days"], rec["times"], rec["icon"], rec["color"], rec["active"],
                     rec["start_date"], rec["end_date"], rec["interval_minutes"], rec["times_per_day"], rec["duration_minutes"], now_local(), task_id],
                )
                row = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
            self._json(HTTPStatus.OK, {"task": task_to_dict(row)})
            return
        m = re.match(r"^/api/entries/(\d+)$", urlparse(self.path).path)
        if not m:
            self._json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
            return
        entry_id = int(m.group(1))
        body, err = self._read_json()
        if err:
            self._json(HTTPStatus.BAD_REQUEST, {"errors": {"body": err}})
            return
        with LOCK, db() as conn:
            existing = conn.execute("SELECT * FROM entries WHERE id=?", (entry_id,)).fetchone()
            if not existing:
                self._json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
                return
            updates, errors = validate_update(body, existing)
            if errors:
                self._json(HTTPStatus.BAD_REQUEST, {"errors": errors})
                return
            if not updates:
                self._json(HTTPStatus.BAD_REQUEST, {"errors": {"body": "nothing_to_update"}})
                return
            updates["updated"] = now_local()
            conn.execute("UPDATE entries SET " + ",".join(f"{k}=?" for k in updates) + " WHERE id=?",
                         list(updates.values()) + [entry_id])
            row = conn.execute("SELECT * FROM entries WHERE id=?", (entry_id,)).fetchone()
        self._json(HTTPStatus.OK, {"entry": row_to_dict(row)})

    def do_DELETE(self) -> None:
        m = re.match(r"^/api/tasks/(\d+)$", urlparse(self.path).path)
        if m:
            task_id = int(m.group(1))
            with LOCK, db() as conn:
                checkins = conn.execute("SELECT entry_id FROM task_checkins WHERE task_id=? AND entry_id IS NOT NULL", (task_id,)).fetchall()
                for row in checkins:
                    conn.execute("DELETE FROM entries WHERE id=?", (row["entry_id"],))
                conn.execute("DELETE FROM task_checkins WHERE task_id=?", (task_id,))
                cur = conn.execute("DELETE FROM tasks WHERE id=?", (task_id,))
            if cur.rowcount == 0:
                self._json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
            else:
                self._json(HTTPStatus.OK, {"deleted": task_id})
            return
        m = re.match(r"^/api/entries/(\d+)$", urlparse(self.path).path)
        if not m:
            self._json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
            return
        with LOCK, db() as conn:
            cur = conn.execute("DELETE FROM entries WHERE id=?", (int(m.group(1)),))
        if cur.rowcount == 0:
            self._json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
        else:
            self._json(HTTPStatus.OK, {"deleted": int(m.group(1))})


def minutes_between(start: str, end: str | None):
    if not end or not valid_stamp(start) or not valid_stamp(end):
        return None
    a = datetime.strptime(start, "%Y-%m-%dT%H:%M")
    b = datetime.strptime(end, "%Y-%m-%dT%H:%M")
    minutes = int((b - a).total_seconds() // 60)
    return minutes if 0 <= minutes <= 24 * 60 else None


class PlainCertHandler(Handler):
    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path in ("/ca.crt", "/") and CA_CERT and os.path.isfile(CA_CERT):
            with open(CA_CERT, "rb") as fh:
                self._send(HTTPStatus.OK, fh.read(), TYPES[".crt"],
                           {"Content-Disposition": 'attachment; filename="babylog-ca.crt"'})
        elif path == "/healthz":
            self._json(HTTPStatus.OK, {"ok": True, "version": VERSION})
        else:
            self.send_response(HTTPStatus.FOUND)
            self.send_header("Location", f"https://{self.headers.get('Host', '').split(':')[0]}:{PORT}/")
            self.end_headers()


def main() -> None:
    init_db()
    https = ThreadingHTTPServer((HOST, PORT), Handler)
    use_tls = bool(CERT and KEY and os.path.isfile(CERT) and os.path.isfile(KEY))
    if use_tls:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.minimum_version = ssl.TLSVersion.TLSv1_2
        ctx.load_cert_chain(CERT, KEY)
        https.socket = ctx.wrap_socket(https.socket, server_side=True)
    print(f"baby-log: {PORT} ({'TLS' if use_tls else 'plain HTTP'}), db {DB}", flush=True)

    threads = [threading.Thread(target=https.serve_forever, kwargs={"poll_interval": 0.5}, daemon=True)]
    if HTTP_PORT and CA_CERT and os.path.isfile(CA_CERT):
        plain = ThreadingHTTPServer((HOST, HTTP_PORT), PlainCertHandler)
        threads.append(threading.Thread(target=plain.serve_forever, kwargs={"poll_interval": 0.5}, daemon=True))
        print(f"baby-log: cert download on http://{HOST}:{HTTP_PORT}/ca.crt", flush=True)
    for t in threads:
        t.start()
    try:
        while True:
            threading.Event().wait(3600)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
