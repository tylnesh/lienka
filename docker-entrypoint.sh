#!/bin/sh
# Lienka container entrypoint: ensure schema, optionally seed a throwaway demo, serve.
set -eu
cd /app

python3 -c "import server; server.init_db()"

if [ "${DEMO:-0}" = 1 ]; then
    n=$(python3 - <<'EOF'
import os, sqlite3
print(sqlite3.connect(os.path.join(os.environ.get("DATA_DIR", "."), "baby.db"))
      .execute("SELECT COUNT(*) FROM entries").fetchone()[0])
EOF
)
    if [ "$n" = 0 ]; then
        BIRTH_DATE=$(python3 -c "import datetime;print((datetime.date.today()-datetime.timedelta(days=9)).isoformat())") \
            python3 tools/seed_demo.py --open-timer \
            || echo "entrypoint: demo seed skipped" >&2
    fi
fi

exec python3 -u server.py
