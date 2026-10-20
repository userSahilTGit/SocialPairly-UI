#!/usr/bin/env bash
# Run on the EC2 host after git pull (from repo root or adjust paths).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
UI="$ROOT/SocialPairly-UI"
BE="$ROOT/SocialPairly-Workflow-manager"
WWW="${WWW_ROOT:-/var/www/socialpairly}"

echo "==> Build UI (production, same-origin /api)"
cd "$UI"
cp -n .env.production.example .env.production 2>/dev/null || true
npm ci
npm run build
sudo mkdir -p "$WWW"
sudo rsync -a --delete "$UI/dist/" "$WWW/"

echo "==> Install nginx site (if not already)"
if [[ -d /etc/nginx/sites-available ]]; then
  sudo cp "$UI/deploy/nginx.conf" /etc/nginx/sites-available/socialpairly
  sudo ln -sf /etc/nginx/sites-available/socialpairly /etc/nginx/sites-enabled/socialpairly
  sudo nginx -t && sudo systemctl reload nginx
fi

echo "==> Restart backend (expects mvnw + profile / env on server)"
cd "$BE"
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
export APP_FRONTEND_URL="${APP_FRONTEND_URL:-http://3.151.77.90}"
# Stop previous java on 9011 if you use a process manager; adjust to your service name:
# sudo systemctl restart socialpairly-be

echo "Done. Open http://3.151.77.90/signin and https://www.socialpairly.com/signin"
echo "GCP must list those exact origins under Authorized JavaScript origins."
