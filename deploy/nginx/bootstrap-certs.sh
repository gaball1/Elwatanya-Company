#!/bin/sh
# =============================================================================
# El Wataniya ERP - bootstrap TLS certificates for the reverse proxy.
#
# Production: use Let's Encrypt (recommended) or your CA. With certbot:
#   docker compose -f docker-compose.prod.yml -f docker-compose.tls.yml \
#     run --rm certbot certonly --webroot -w /var/www/certbot \
#     -d erp.example.com --email ops@example.com --agree-tos --no-eff-email
# Then symlink the issued certs into deploy/nginx/certs/ as fullchain.pem and
# privkey.pem (see below).
#
# Local / staging test: run with USE_SELF_SIGNED=1 to generate a throwaway
# self-signed cert so the proxy chain can be exercised over https.
# =============================================================================
set -eu

cd "$(dirname "$0")"
CERTS_DIR=./certs
mkdir -p "$CERTS_DIR" ./www

if [ "${USE_SELF_SIGNED:-0}" = "1" ]; then
  echo ">> Generating self-signed cert (localhost + erp.local) for local tests"
  openssl req -x509 -nodes -newkey rsa:2048 -days 30 \
    -keyout "$CERTS_DIR/privkey.pem" \
    -out "$CERTS_DIR/fullchain.pem" \
    -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:erp.local,IP:127.0.0.1"
  openssl dhparam -out "$CERTS_DIR/dhparam.pem" 2048 2>/dev/null || true
  echo ">> Certs written to $CERTS_DIR"
  exit 0
fi

# Production path: expect certbot to have written the live certs.
LIVE_DIR=/etc/letsencrypt/live
if [ -d "$LIVE_DIR" ]; then
  DOMAIN=$(ls -1 "$LIVE_DIR" | head -n1)
  ln -sf "$LIVE_DIR/$DOMAIN/fullchain.pem" "$CERTS_DIR/fullchain.pem"
  ln -sf "$LIVE_DIR/$DOMAIN/privkey.pem"  "$CERTS_DIR/privkey.pem"
  echo ">> Linked Let's Encrypt certs for $DOMAIN"
else
  echo "!! /etc/letsencrypt/live not found."
  echo "   Run certbot first, then re-run this script."
  echo "   For a quick local test use: USE_SELF_SIGNED=1 $0"
  exit 1
fi
