#!/bin/bash
# ============================================================
# LIANKA PLATFORM — VPS DEPLOYMENT SCRIPT
# Run as root on fresh Ubuntu 22.04 VPS
# Usage: bash deploy.sh
# ============================================================

set -e

echo "======================================"
echo "  LIANKA PLATFORM DEPLOYMENT"
echo "======================================"

# ─── System update ───────────────────────────────────────────
echo "[1/8] Updating system..."
apt-get update -y && apt-get upgrade -y
apt-get install -y curl wget git ufw

# ─── Docker installation ────────────────────────────────────
echo "[2/8] Installing Docker..."
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker

# Install Docker Compose v2
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# ─── Firewall ────────────────────────────────────────────────
echo "[3/8] Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ─── Create app directory ────────────────────────────────────
echo "[4/8] Setting up app directory..."
mkdir -p /opt/lianka
cd /opt/lianka

# ─── Environment setup ──────────────────────────────────────
echo "[5/8] Setting up environment..."
if [ ! -f .env ]; then
  echo "ERROR: .env file not found in /opt/lianka"
  echo "Please copy your .env file to /opt/lianka/.env before continuing"
  echo "Reference: .env.example in the project root"
  exit 1
fi

# ─── SSL Certificate ─────────────────────────────────────────
echo "[6/8] Getting SSL certificate..."
apt-get install -y certbot
DOMAIN=$(grep FRONTEND_URL .env | cut -d= -f2 | sed 's/https:\/\///')
certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos \
  --email $(grep GMAIL_USER .env | cut -d= -f2) || echo "SSL setup — configure manually if this fails"

# ─── Build and start ─────────────────────────────────────────
echo "[7/8] Building and starting containers..."
docker compose build --no-cache
docker compose up -d

# ─── Initialize admin ────────────────────────────────────────
echo "[8/8] Waiting for backend to start..."
sleep 15

ADMIN_EMAIL=$(grep INITIAL_ADMIN_EMAIL .env | cut -d= -f2)
ADMIN_PASS=$(grep INITIAL_ADMIN_PASSWORD .env | cut -d= -f2)

curl -X POST http://localhost:3001/admin/init \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\",\"full_name\":\"Super Admin\"}" \
  2>/dev/null && echo "Admin initialized" || echo "Admin may already exist"

echo ""
echo "======================================"
echo "  DEPLOYMENT COMPLETE"
echo "======================================"
echo "  Frontend: https://$DOMAIN"
echo "  API:      https://$DOMAIN/api"
echo "  Logs:     docker compose logs -f"
echo "======================================"

# Auto-renewal cron for SSL
(crontab -l 2>/dev/null; echo "0 12 * * * certbot renew --quiet && docker compose restart nginx") | crontab -
