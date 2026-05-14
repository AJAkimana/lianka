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
echo "[1/4] Installing production dependencies..."
cd "$APP_DIR"
yarn install --production --frozen-lockfile --non-interactive

# ─── 2. Run database migrations ───────────────────────────────
echo "[2/4] Checking for pending migrations..."
./node_modules/.bin/typeorm -d dist/db/data.source.js migration:show

echo "[3/4] Running migrations..."
./node_modules/.bin/typeorm -d dist/db/data.source.js migration:run

# ─── 3. PM2 — reload or start ────────────────────────────────
echo "[4/4] Starting / reloading PM2 process..."
pm2 startOrReload ecosystem.config.js --env production

# ─── 4. Save PM2 process list (survives reboots) ─────────────
echo "[4/4] Saving PM2 process list..."
pm2 save

echo ""
echo "✅  $APP_NAME deployed successfully"
pm2 show "$APP_NAME"
