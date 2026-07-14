#!/usr/bin/env bash
# Deploy TierDrinks to the VPS. Run from the repo root once SSH to the VPS works.
#   ./deploy.sh            # uses ssh alias "vps"
#   ./deploy.sh root@1.2.3.4
#
# Zero-deps app → deploy is just rsync + systemd restart. Live ratings
# (data/db.json) are excluded so a deploy never wipes real data.
set -euo pipefail

HOST="${1:-vps}"
REMOTE_DIR="/opt/tierdrinks"

echo "→ rsync → ${HOST}:${REMOTE_DIR}"
ssh "$HOST" "mkdir -p ${REMOTE_DIR}"
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'data/db.json' \
  --exclude 'data/db.json.tmp' \
  ./ "${HOST}:${REMOTE_DIR}/"

echo "→ systemd + nginx on ${HOST}"
ssh "$HOST" bash -s <<'REMOTE'
set -euo pipefail
install -m644 /opt/tierdrinks/ops/tierdrinks.service /etc/systemd/system/tierdrinks.service
systemctl daemon-reload
systemctl enable tierdrinks >/dev/null 2>&1 || true
systemctl restart tierdrinks

if [ ! -e /etc/nginx/sites-enabled/drinks.bondapp.ru ]; then
  install -m644 /opt/tierdrinks/ops/nginx-drinks.conf /etc/nginx/sites-available/drinks.bondapp.ru
  ln -sf /etc/nginx/sites-available/drinks.bondapp.ru /etc/nginx/sites-enabled/drinks.bondapp.ru
  nginx -t && systemctl reload nginx
fi

sleep 1
curl -fsS -o /dev/null -w 'local health: %{http_code}\n' http://127.0.0.1:3000/api/state || echo 'WARN: app not responding on :3000'
systemctl --no-pager --lines=4 status tierdrinks || true
REMOTE

echo "✓ deployed. Check: http://drinks.bondapp.ru (after DNS record exists)"
