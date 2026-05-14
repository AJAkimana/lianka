#!/usr/bin/env bash
# ============================================================
# LIANKA FRONTEND — VPS DEPLOY SCRIPT
# Called by GitHub Actions after rsync pushes the build output.
# Assumes: node and pm2 are installed on the VPS.
# ============================================================

set -euo pipefail

APP_NAME="lianka-frontend"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STANDALONE_DIR="$APP_DIR/.next/standalone"

echo "──────────────────────────────────────────"
echo "  Deploying $APP_NAME"
echo "  Dir: $APP_DIR"
echo "──────────────────────────────────────────"

cd "$APP_DIR"

echo "[1/4] Installing dependencies..."
yarn install --frozen-lockfile --non-interactive

echo "[2/4] Building frontend..."
yarn build

if [ ! -f .next/standalone/server.js ]; then
  echo "ERROR: .next/standalone/server.js not found. Did the build sync correctly?"
  exit 1
fi

if [ ! -d .next/static ]; then
  echo "ERROR: .next/static not found. Static assets are missing."
  exit 1
fi

if [ ! -d public ]; then
  echo "ERROR: public/ not found. Public assets are missing."
  exit 1
fi

# Ensure standalone has the static and public assets in the expected locations.
mkdir -p "$STANDALONE_DIR/.next"
rm -rf "$STANDALONE_DIR/.next/static" "$STANDALONE_DIR/public"
cp -R .next/static "$STANDALONE_DIR/.next/static"
cp -R public "$STANDALONE_DIR/public"

echo "[3/4] Reloading PM2..."
pm2 startOrReload ecosystem.config.js --env production
echo "[4/4] Saving PM2 process list..."
pm2 save

echo ""
echo "✅  $APP_NAME deployed successfully"
pm2 show "$APP_NAME"
