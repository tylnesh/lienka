# Lienka — self-hosted baby log. Plain-HTTP server; put TLS in front
# (Caddy/Traefik/Koyeb edge) or mount your own certs and set CERT/KEY.
#
#   docker run -d -p 8080:8080 -v lienka-data:/data ghcr.io/<you>/lienka:latest
#   docker run -d -p 8080:8080 -e DEMO=1 ghcr.io/<you>/lienka:latest   # throwaway demo, seeds itself

FROM python:3.12-alpine
WORKDIR /app
COPY server.py ./
COPY docker-entrypoint.sh ./
COPY static/ ./static/
COPY tools/seed_demo.py ./tools/seed_demo.py

ENV DATA_DIR=/data PORT=8080 HTTP_PORT=0 TZ=UTC DEMO=0
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=60s --timeout=5s CMD python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8080/healthz',timeout=3)"

# DEMO=1 seeds a synthetic ~9-day-old baby when the DB is empty (e.g. after a
# free-tier scale-to-zero wipe), so the instance self-heals. Real installs
# (DEMO=0) never seed and keep their own data.
RUN chmod +x docker-entrypoint.sh
ENTRYPOINT ["./docker-entrypoint.sh"]
