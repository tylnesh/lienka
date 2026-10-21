#!/usr/bin/env bash
# Private CA + server certificate so family devices trust the baby log over HTTPS
# without a public domain. Alternative: put Caddy/nginx in front with Let's Encrypt,
# or reach the app through Tailscale/WireGuard (see README).
#   certs/ca.key    stays on this machine — never copy it to the server
#   certs/ca.crt    install on phone(s)/desktop; also offered at http://<host>:8473/ca.crt by the app
#   certs/server.{key,crt}  go to the server (CERT / KEY / CA_CERT env vars)
# iOS trusts leaf certificates for at most 825 days, so the server cert is made 800 days long (renew by re-running).
#
# Bake your own names/IPs into the certificate with HOSTS (comma-separated, DNS names and IPs mixed):
#   HOSTS=babyhost.local,babyhost,192.168.1.20,100.64.0.5 ./make_certs.sh
set -euo pipefail
cd "$(dirname "$0")/certs"
umask 077
HOSTS_CSV=${HOSTS:-babyhost.local,babyhost,127.0.0.1}
SAN=""
for h in ${HOSTS_CSV//,/ }; do
  case "$h" in
    *[!0-9.]*) SAN+="DNS:$h," ;;   # names
    *)         SAN+="IP:$h," ;;    # IPv4 literals
  esac
done
SAN=${SAN%,}
if [ ! -f ca.key ]; then
  openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -keyout ca.key -out ca.crt \
    -days 3650 -subj "/CN=Baby log local CA" \
    -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign"
fi
openssl req -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -keyout server.key -out server.csr \
  -subj "/CN=baby log server"
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 800 \
  -extfile <(printf '%s\n' \
    "subjectAltName=$SAN" \
    "extendedKeyUsage=serverAuth" "keyUsage=critical,digitalSignature" "basicConstraints=CA:FALSE")
rm -f server.csr
chmod 644 ca.crt server.crt
openssl x509 -in server.crt -noout -subject -ext subjectAltName -enddate
