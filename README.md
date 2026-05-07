# LIANKA INVESTMENT PLATFORM
## Complete Deployment Guide

---

## WHAT THIS IS
Lianka is a manual-ledger investment platform. Users deposit USDT to your Trust Wallet, you approve them in the admin panel, the system credits their account and runs daily ROI. Withdrawals are manually sent from your Trust Wallet and marked complete in admin.

**No blockchain automation. No smart contracts. Pure database ledger.**

---

## TECH STACK
- **Backend:** NestJS + TypeORM + PostgreSQL
- **Frontend:** Next.js 14
- **Cache/Queue:** Redis
- **Proxy:** Nginx
- **Containerization:** Docker + Docker Compose
- **Email:** Gmail SMTP
- **Hosting:** Ubuntu 22.04 VPS

---

## PROJECT STRUCTURE
```
lianka/
├── database/
│   └── schema.sql          ← Complete DB schema
├── backend/
│   └── src/
│       └── modules/        ← All backend modules
├── frontend/
│   └── src/
│       └── app/            ← All 27 screens
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
├── .env.example
└── deploy.sh
```

---

## STEP 1 — PREPARE VPS
Get a fresh Ubuntu 22.04 VPS (minimum 2GB RAM, 2 vCPU, 40GB SSD)

```bash
ssh root@YOUR_VPS_IP
```

---

## STEP 2 — UPLOAD PROJECT
```bash
# From your local machine:
scp -r lianka/ root@YOUR_VPS_IP:/opt/lianka
```

---

## STEP 3 — CONFIGURE ENVIRONMENT
```bash
cd /opt/lianka
cp .env.example .env
nano .env
```

Fill in every value:
- `DB_PASSWORD` — choose a strong password (32+ chars)
- `JWT_SECRET` — run `openssl rand -hex 64` and paste result
- `JWT_REFRESH_SECRET` — run `openssl rand -hex 64` again
- `REDIS_PASSWORD` — choose a strong password
- `GMAIL_APP_PASSWORD` — see Gmail setup below
- `FRONTEND_URL` — your domain, e.g. `https://lianka.com`
- `NEXT_PUBLIC_API_URL` — e.g. `https://lianka.com/api`
- `INITIAL_ADMIN_PASSWORD` — your admin panel password

---

## STEP 4 — GMAIL APP PASSWORD SETUP
1. Go to https://myaccount.google.com
2. Security → 2-Step Verification (enable if not already)
3. Security → App passwords
4. Create: App name = "Lianka", App type = Mail
5. Copy the 16-character password → paste into `.env` as `GMAIL_APP_PASSWORD`

---

## STEP 5 — POINT DOMAIN TO VPS
In your domain registrar (or DNS provider):
```
A record: @ → YOUR_VPS_IP
A record: www → YOUR_VPS_IP
```
Wait 5–15 minutes for DNS to propagate.

---

## STEP 6 — UPDATE NGINX CONFIG
```bash
nano /opt/lianka/nginx/nginx.conf
```
Replace `yourdomain.com` with your actual domain (appears 3 times).

---

## STEP 7 — DEPLOY
```bash
cd /opt/lianka
chmod +x deploy.sh
bash deploy.sh
```

This will:
- Install Docker
- Configure firewall (ports 22, 80, 443)
- Get SSL certificate from Let's Encrypt
- Build and start all containers
- Initialize the database schema
- Create your first admin account

---

## STEP 8 — VERIFY
```bash
# Check containers are running
docker compose ps

# Check logs
docker compose logs backend --tail=50
docker compose logs frontend --tail=50

# Test API
curl https://yourdomain.com/api/health
```

---

## ADMIN PANEL ACCESS
URL: `https://yourdomain.com/admin`
Email: value of `INITIAL_ADMIN_EMAIL` in .env
Password: value of `INITIAL_ADMIN_PASSWORD` in .env

**Change your password immediately after first login.**

---

## DAILY OPERATIONS

### Approving Deposits
1. User sends USDT to your Trust Wallet address
2. User submits TXID in the app
3. You verify the TX on the blockchain explorer
   - TRC20: https://tronscan.org
   - BEP20: https://bscscan.com
4. Admin panel → Deposits → Approve (or Reject with reason)
5. User's account is credited automatically

### Processing Withdrawals
1. User requests withdrawal in the app
2. Admin panel → Withdrawals → Review
3. Send USDT from your Trust Wallet to the user's address
4. Copy the TX hash
5. Admin panel → Withdrawals → Approve → Enter TX hash → Confirm
6. User is notified automatically

### Running Daily ROI
Option A — Automatic (recommended): ROI engine runs automatically Monday–Friday at midnight UTC.

Option B — Manual: Admin panel → ROI Engine → Set rates → Run for today

### Setting ROI Rates
Admin panel → ROI Rates → Set rate per timeframe per date
- DAILY plan: max 0.20%
- BIWEEKLY plan: max 0.50%
- 40-Day plan: max 1.00%
- 90-Day plan: max 1.20%
- 180-Day plan: max 1.50%

---

## MAINTENANCE

### Backup database
```bash
docker exec lianka_postgres pg_dump -U lianka_user lianka > backup_$(date +%Y%m%d).sql
```

### Update the platform
```bash
cd /opt/lianka
git pull  # or re-upload files
docker compose build --no-cache
docker compose up -d
```

### View logs
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

### Restart services
```bash
docker compose restart backend
docker compose restart frontend
docker compose restart  # restart everything
```

---

## TRUST WALLET ADDRESSES IN THE SYSTEM
- TRC20: `TDFeZPisd4Rs31pkVCPGhz6QB6Y349jqHQ`
- BEP20: `0x1c9E87A2bE00A7bE0D76aEc122c2774DF996462D`

These are seeded in `platform_config` table and displayed to users in the deposit flow.

---

## SUPPORT
Email: bcebrain@gmail.com
