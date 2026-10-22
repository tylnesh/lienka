# Lienka — baby log

A small, **self-hosted** baby tracker: nappies, feeds, sleep, walks, baths, medications, activities, measurements (weight / temp / vitamin D) and notes — shared live between the caregivers' phones. No cloud, no accounts, no telemetry: the whole state is one SQLite file on your own hardware, and the app only ever talks to your own server.

The client is a plain PWA (installable, offline shell) served by the same process — open the URL on each device, *Add to Home Screen*, done. Works on iOS, Android, desktop.

## What you get

- **Today** — running timers (feed per side/method, sleep, walk, bath, activity), one-tap diaper chips with undo, quick-log tiles, daily stats, "last feed + time to next", notices card for threshold signals.
- **Log** — day-grouped entries, user/kind filters, edit & delete, paging.
- **Charts** — output, feeds, sleep, weight (WHO weight-velocity bands), care time; 7/14/30 days.
- **Insights** — deterministic checks computed from your records against registered references (WHO, NHS, ABM, Slovak MZ SR guidance for BFHI care); no AI, no network calls, every threshold shows its source or is marked `[unsourced]`. Not medical advice.
- **Doctor view** — pediatrician-question checklist generated from the same signals; copy to clipboard for the visit.
- Recurring reminders with `.ics` export, CSV export, dark/light theme, SK + EN UI, optional scale-photo OCR for feeding weights, optional BYO-LLM assistant (off by default — keys stay server-side, see `server.py`).

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
```

## Roadmap

Snap Store package (`snapcraft.yaml`, strict confinement), optional token/PIN gate for non-LAN setups, and guided Let's Encrypt issuance. Ideas welcome via issues.

## Privacy

No telemetry, no third-party servers, no accounts. The only outbound network requests are ones you configure yourself (the optional BYO-LLM endpoint) or explicit documentation links. One SQLite file is the whole state: copy it, restore it, own it.

## License

GPL-3.0-only (see [LICENSE](LICENSE)). All source files carry an `SPDX-License-Identifier` header; icons and assets in this repository are covered by the same license.

