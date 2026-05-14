#!/usr/bin/env bash
# ============================================================
# LIANKA FRONTEND — VPS DEPLOY SCRIPT
# Called by GitHub Actions after rsync pushes the build output.
# Assumes: node and pm2 are installed on the VPS.
# ============================================================

set -euo pipefail

APP_NAME="lianka-frontend"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "──────────────────────────────────────────"
echo "  Deploying $APP_NAME"
echo "  Dir: $APP_DIR"
echo "──────────────────────────────────────────"

cd "$APP_DIR"

if [ ! -f .next/standalone/server.js ]; then
  echo "ERROR: .next/standalone/server.js not found. Did the build sync correctly?"
  exit 1
fi

pm2 startOrReload ecosystem.config.js --env production
pm2 save

echo ""
echo "✅  $APP_NAME deployed successfully"
pm2 show "$APP_NAME"
