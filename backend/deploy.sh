#!/usr/bin/env bash
# ============================================================
# LIANKA BACKEND — VPS DEPLOY SCRIPT
# Called by GitHub Actions after rsync pushes the built app.
# Assumes: yarn, pm2, and node are already installed on the VPS.
# ============================================================

set -euo pipefail

APP_NAME="lianka-backend"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "──────────────────────────────────────────"
echo "  Deploying $APP_NAME"
echo "  Dir: $APP_DIR"
echo "──────────────────────────────────────────"

# ─── 1. Install production dependencies ──────────────────────
echo "[1/3] Installing production dependencies..."
cd "$APP_DIR"
yarn install --production --frozen-lockfile --non-interactive

# ─── 2. PM2 — reload or start ────────────────────────────────
echo "[2/3] Starting / reloading PM2 process..."
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
  pm2 reload "$APP_NAME" --update-env
else
  pm2 start dist/main.js \
    --name "$APP_NAME" \
    --instances max \
    --exec-mode cluster \
    --env production \
    --time
fi

# ─── 3. Save PM2 process list (survives reboots) ─────────────
echo "[3/3] Saving PM2 process list..."
pm2 save

echo ""
echo "✅  $APP_NAME deployed successfully"
pm2 show "$APP_NAME"
