# Lienka — baby log

A small, **self-hosted** baby tracker: nappies, feeds, pumping & milk bank, sleep, walks, baths, medications, activities, measurements (weight / height / temp / vitamin D) and notes — shared live between the caregivers' phones. No cloud, no accounts, no telemetry: the whole state is one SQLite file on your own hardware, and the app only ever talks to your own server.

The client is a plain PWA (installable, offline shell) served by the same process — open the URL on each device, *Add to Home Screen*, done. Works on iOS, Android, desktop.

## What you get

- **Today** — running timers (feed per side/method, pumping, sleep, walk, bath, activity), one-tap diaper chips with undo, quick-log tiles, daily stats incl. today's expressed volume and the freezer bank, multi-tier milk pantry (fridge jug + freezer stash, one-tap "freeze the surplus", CDC dating), "last feed + time to next", notices card for threshold signals.
- **Log** — day-grouped entries, user/kind filters, edit & delete, paging.
- **Charts** — output, feeds, pumping (daily supply, 3-day trend, bank), sleep, weight (WHO weight-velocity bands), length (WHO length-for-age P3–P97 envelope), care time; 7/14/30 days.
- **Insights** — deterministic checks computed from your records against registered references (WHO, NHS, ABM, Slovak MZ SR guidance for BFHI care); no AI, no network calls, every threshold shows its source or is marked `[unsourced]`. Not medical advice.
- **Doctor view** — pediatrician-question checklist generated from the same signals; copy to clipboard for the visit.
- Recurring reminders with `.ics` export, CSV export, dark/light theme, SK + EN UI, optional scale-photo OCR for feeding weights, optional BYO-LLM assistant that auto-detects local runners (Ollama, LM Studio, vLLM, llama.cpp/LocalAI, Jan, GPT4All, KoboldCpp) — off by default, keys stay server-side, see `server.py`.
- **Lienka buddy (optional, v1.25)** — a tiny Tamagotchi-style ladybug on Today whose mood, energy and spots are *derived live from your own logs*: she hatches with the first entry, perks up on every new one and dozes during long quiet spells, but **can never die or be failed**, and the message during silence is "long silences count as caring too", never guilt. Spots grow with the baby's age — one every ~52 weeks, the full seven around the first birthday. Nothing about her is stored: `GET /api/pet` recomputes her from the entries on every request, so backups/restores/CSV round-trips need no extra state. She also wears a **speech bubble**: short murmurs baked from pre-written bilingual phrases filled with real numbers from your data (a new sleep record, the weekly scale gain, a seen-for-N-days streak, a quiet walks stretch — facts only, never advice; anything threshold-based she only points to). Tap her to open *What Lienka says*: celebrations, gentle observations, and the currently flagged signals quoted exactly as Tips word them, **each with its registered source link or `[unsourced]`**, with the familiar ack/dismiss/edit controls and the not-medical-advice disclaimer. If the BYO-LLM assistant is configured, "voice: Auto" may let it rephrase a bubble line for variety — numbers are validated against the template and it silently falls back if the model breaks them; Settings → *Lienka's voice* keeps templates only. Her **expression mirrors the logged data against the registered references** she already quotes: measured milk above the age band makes her round, smiley and slightly stuffed-looking (belly squash comes from the same S119–S121 daily band the Intake chart draws), a low wet-nappy or weight-velocity signal droops her antennae into a fussy hungry look, and a fever tints her shell pale with a sweat bead — every expression is driven only by signals Tips already flags **with their sources**, *never* by a private opinion, and the sheet explains in "Why she looks like this" which numbers and references produced today's face. Between events she keeps her own little life going — glancing around, grooming an antenna, stretching or (when stuffed) letting out a tiny burp, dreaming REM-glances while asleep, a natural double blink — and **tapping her shell directly** gets a squishy boop plus her next thought. Off by default; Settings → *Lienka buddy* turns her on per device.

Writes are currently unauthenticated, so **keep the instance on a trusted network** (LAN or your private tunnel) — never port-forward it to the internet. A token/PIN gate is planned (see Roadmap).

## Quickstart

Plain Python 3.10+ (stdlib only, zero dependencies):

```bash
DATA_DIR=./data BIRTH_DATE=2026-01-15 USERS=parent1,parent2,others python3 server.py
```

…then open `http://<host>:8472/`. On first run the app greets you with a small setup card — name your caregivers and birth date there; `USERS` / `BIRTH_DATE` above are only initial defaults, once saved in the app they live in the database. With TLS material (`CERT`/`KEY`) the same port serves HTTPS; a plain-HTTP sidecar on `8473` offers `/ca.crt` for your own CA. Without certs it is plain HTTP — fine on a trusted LAN, add TLS via the options below when you want green locks.

Docker:

```bash
docker run -d --name lienka -p 8472:8472 -v $PWD/data:/data -e BIRTH_DATE=2026-01-15 lienka
# or take a look first with a synthetic demo database (auto-resets on restart):
docker build -t lienka . && docker run -d -p 8472:8472 -e DEMO=1 lienka
```

### Upgrading to v1.25 (Lienka buddy)

Nothing to do — one new read-only endpoint (`GET /api/pet`: mood/energy/spots plus up to four fact-only murmurs `{code, tone, params}`), a card with speech bubble, a *What Lienka says* sheet and two Settings toggles (buddy on/off, voice Auto/Templates — the LLM only ever rephrases, numbers are verified). Her face, roundness and tempo additionally mirror how today's intake, nappy and weight signals sit against the already-registered references (sourced Tips drive the look; the sheet always names the numbers and sources behind it). The companion is **off by default** and both flags live only in each device's browser storage, so her appearance is purely a per-device choice; your data model is untouched. Smoke-test her against a scratch server with `python3 tools/tests/pet_api_test.py`.

### Upgrading to v1.24 (multi-tier milk storage)

No action needed — existing bags default to the **fridge** tier. The bank now mirrors how milk is really stored: today's expressed milk sits in the fridge jug (CDC use-by ≤ 4 days, S48), and a one-tap **"Freeze the surplus"** on the Today card moves what's left into freshly dated freezer stock (~6 months, CDC). Bottles without an explicit bag link now draw from the fridge first and only then the freezer, oldest-first in both tiers; the pump dialog gained a Fridge/Freezer choice that pre-dates the use-by accordingly (`pump_storage` column, `/api/stash/freeze`).

A new **Príjem / Intake** chart tab shows how much milk the baby actually drank per day: bottle feeds plus scale-derived amounts (`feed_ml`, auto-filled from before/after weigh-ins) and what was drunk directly during pumping sessions (`fed_ml`), with a 3-day moving average line and the typical daily range for age/weight drawn as a dashed band — same rule (S119–S121) as the milk hint in the feed dialog. Unweighed breastfeeds have no measured volume, so bars can under-report; the band is the honest yardstick.

Same-release UI polish: weigh-in slots no longer hint "kg" in a grams-based app (placeholder is now `6,24 / 6240`, tooltip explains both formats), the "≈ from minutes/swallows" estimate chips render as full-size pills instead of squashed icon buttons, Settings segmented controls wrap on phones instead of silently scrolling, quick-tile and timer labels break at characters only when unavoidable, chart gridlines use round numbers (no more `3.8` on count charts), and the sources list now tells WHO GVS (velocity) apart from WHO LFA (length/height, S46/S47). The Slovak strings went through a copy-edit pass verified against real Slovak sources ("odstriekanie"/"zmrazené" per hospital & parenting sites, "dĺžka" for infants under 2 per WHO conventions): bottle and formula rows no longer say "Kojenie" (breastfeeding) — feeds are "Kŕmenie" — plus fixes for diacritics (`kŕmenie`, `vitamín`), Czechisms (`Pauzovatelná`→`Pozastaviteľná`, `miminko`→`bábätko`), typos (`nainštalujte`, `deň pôjde o`), anglicisms (`timer`→`časovač`, `logovanie`, `cluster feeding` glossed) and internal references ("watch-outs report (reports/2026-10-12)") removed from user-facing text.

### Upgrading to v1.23 (pumping & milk bank)

Pumping became its own record kind — mother's supply and freezer **bank**, no longer a baby "feed method". The reclassification of historical `pump` feed rows is **automated**: it runs at every server start (idempotent, no-op once applied), so a container restart or `snap refresh` completes the upgrade on its own. `python3 tools/migrate_pump.py --db <path> [--dry-run]` remains as an optional inspection/backup helper (snap data lives in `/var/snap/lienka/common/data/baby.db`). New in the app: per-session freezer bags with use-by dates and FIFO draw-down (`/api/stash`), a bottle→bag provenance picker, pumping chart, height (cm) measures with WHO length-for-age bands.

## Configuration

All via environment variables (see `server.py` docstring for the canonical list):

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATA_DIR` | folder holding `baby.db` — this is the whole app state; back it up | `/data` |
| `USERS` | comma-separated caregiver ids shown in the UI — editable later in Settings, stored values win | `parent1,parent2,others` |
| `BIRTH_DATE` | `YYYY-MM-DD`, drives age readouts & growth charts — editable later in Settings | *(empty = age hidden)* |
| `HOST` / `PORT` | bind address / main listener | `0.0.0.0` / `8472` |
| `HTTP_PORT` | plain-HTTP `/ca.crt` sidecar (0 = off) | `8473` |
| `CERT` / `KEY` / `CA_CERT` | TLS material, PEM | *(off = plain HTTP)* |
| `TZ` | container timezone; timestamps are wall-clock local | — |
| `LIENKA_LLM_PROBE_HOSTS` | extra hosts for AI auto-detection, comma-separated `host` or `host:port` (think Docker bridge IP, or the host machine from a snap) | localhost only |

## TLS options

1. **Own little CA (no domain needed).** `./make_certs.sh` creates a private CA + 800-day server cert; pass your names/IPs through `HOSTS=babyhost.local,babyhost,192.168.1.20 ./make_certs.sh`. Install `certs/ca.crt` on each device (the app also offers it at `http://<host>:8473/ca.crt`). Keep `ca.key` off the server.
2. **Reverse proxy with a real certificate.** If you have a domain, Caddy issues Let's Encrypt automatically:

   ```caddyfile
   baby.example.com {
       reverse_proxy 127.0.0.1:8472
   }
   ```

3. **Tailscale's built-in HTTPS** (`tailscale cert`) if you already run Tailscale — see below.

## Access from outside the LAN: use a private tunnel, don't open ports

The app is designed for trusted networks and has no login yet, so please **do not port-forward 8472 to the internet**. Reach it from anywhere over your own encrypted mesh instead — both options are free, quick to set up, and keep the server invisible to the public internet:

- **[Tailscale](https://tailscale.com)** (easiest). Install on the server and on your phone/laptop, join them to the same tailnet, then browse to `http://<tailscale-ip>:8472` from anywhere. Bonus: `tailscale cert baby.your-tailnet.ts.net` gives you automatic HTTPS with a real certificate inside your private network — no CA wrangling, no domain.
- **WireGuard** (if you prefer it lean and self-contained). Add the server as a WireGuard peer and connect phones through the tunnel; bind the app (or firewall it) so it is only reachable from the WireGuard address, e.g. `HOST=10.8.0.1`, then use `https://10.8.0.1:8472`. Bake that IP into the cert via `HOSTS=… ,10.8.0.1 ./make_certs.sh`.

Either way: no exposed ports, no public DNS, and your baby's data stays inside your network — which is the whole point. 🙂

## Development

```bash
DATA_DIR=/tmp/baby-test HOST=127.0.0.1 PORT=8472 HTTP_PORT=0 python3 server.py   # scratch instance
DATA_DIR=/tmp/baby-test python3 tools/seed_demo.py --open-timer                  # ~9 synthetic newborn days
node tools/checklayout.mjs                                                       # layout checker (playwright)
node tools/shot.mjs --scenario today --tag dev                                  # screenshots → ./screenshots
python3 tools/tests/pump_api_test.py   http://localhost:8499                     # API suites (see headers for setup)
python3 tools/tests/stash_api_test.py  http://localhost:8500                     # milk-bank math incl. FIFO/expiry
python3 tools/tests/tier_api_test.py   http://localhost:8501                     # fridge/freezer tiers + freeze-surplus
node tools/tests/pump_ui_smoke.mjs     http://127.0.0.1:8498                     # headless UI suite (playwright)
```

## Releasing safely — data survival is a hard gate

No deploy or release ships unless the full data lifecycle passes against the candidate code. `./deploy.sh` enforces this automatically: it snapshots the live database (`VACUUM INTO`, kept on athena + pulled to `backups/`), then runs the gate on that real backup **before anything is copied to athena** — a single missing row or ml aborts the deploy. After the restart it re-checks that the live instance still serves a complete export.

```bash
python3 tools/gate_release.py --db backups/backup-<stamp>.db   # what deploy.sh runs, also for snap packaging
```

The gate proves, on throwaway copies only (your database is never written): the backup boots under this code; startup migrations preserve every row, kind-count, ml total and time span (the v1.23 pump→bank reclassification included); `/export.csv` carries all rows with a complete header; and that CSV replays through `tools/import_csv.py` into a fresh instance to identical metrics. GitHub Actions runs the same cycle on synthetic seed data for every push/PR.

If only a CSV export survived (lost disk, new machine), restore into a schema-created but stopped database: `python3 tools/import_csv.py --db <path>/baby.db --csv export.csv` preserves ids and timestamps; `--append` merges into a running log with new ids and remapped bottle→bag links. The everyday restore path remains the SQLite backup: stop the app, replace `baby.db`, start. For snap packaging (`snapcraft pack`) or any release without `deploy.sh`, run the gate manually against a copy of `/var/snap/lienka/common/data/baby.db` first.

## Roadmap

Snap Store package (`snapcraft.yaml`, strict confinement), optional token/PIN gate for non-LAN setups, and guided Let's Encrypt issuance. Ideas welcome via issues.

## Privacy

No telemetry, no third-party servers, no accounts. The only outbound network requests are ones you configure yourself (the optional BYO-LLM endpoint) or explicit documentation links. One SQLite file is the whole state: copy it, restore it, own it.

## License

GPL-3.0-only (see [LICENSE](LICENSE)). All source files carry an `SPDX-License-Identifier` header; icons and assets in this repository are covered by the same license.

