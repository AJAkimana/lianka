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

cd "$APP_DIR"

# ─── 1. Install dependencies ─────────────────────────────────
echo "[1/5] Installing dependencies..."
yarn install --frozen-lockfile --non-interactive

# ─── 2. Build backend ────────────────────────────────────────
echo "[2/5] Building backend..."
yarn build

# ─── 3. Install production-only dependencies ─────────────────
echo "[3/5] Installing production dependencies..."
yarn install --production --frozen-lockfile --non-interactive

# ─── 4. Run database migrations ──────────────────────────────
echo "[4/6] Checking for pending migrations..."
./node_modules/.bin/typeorm -d dist/db/data.source.js migration:show

echo "[5/6] Running migrations..."
./node_modules/.bin/typeorm -d dist/db/data.source.js migration:run

# ─── 5. PM2 — reload or start ────────────────────────────────
echo "[6/7] Starting / reloading PM2 process..."
pm2 startOrReload ecosystem.config.js --env production

# ─── 6. Save PM2 process list (survives reboots) ─────────────
echo "[7/7] Saving PM2 process list..."
pm2 save

echo ""
echo "✅  $APP_NAME deployed successfully"
pm2 show "$APP_NAME"
