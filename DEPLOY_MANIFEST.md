# LIANKA — MASTER DEPLOYMENT MANIFEST
# Single source of truth. Every file. Every path. Every status.
# Generated: 2026-05-06
# Use lianka-FINAL-DEPLOY.zip — this is the ONLY zip you need.

==============================================================
  RULE: DO NOT MIX ZIPS.
  lianka-FINAL-DEPLOY.zip = everything, latest version.
  Ignore all previous zips (lianka-complete.zip, lianka-patch-fixes.zip).
  They are superseded. Delete them.
==============================================================

DEPLOYMENT TARGET: /opt/lianka/ on your Ubuntu VPS
All paths below are relative to /opt/lianka/

==============================================================
  DATABASE
==============================================================

database/schema.sql
  → Run FIRST on fresh database. Creates all 20 tables, views,
    triggers, indexes, and seeds Trust Wallet addresses.
  → Run once. Never again on same DB.

database/patch_001.sql
  → Run SECOND, after schema.sql.
  → Adds: payment_events, withdrawal_records, roi_holidays,
    reinvestment_logs tables.
  → Run once. Never again on same DB.

  CORRECT ORDER:
    psql lianka < database/schema.sql
    psql lianka < database/patch_001.sql

==============================================================
  INFRASTRUCTURE
==============================================================

docker-compose.yml        → Starts all 5 containers
.env.example              → Copy to .env, fill in values
nginx/nginx.conf          → Replace yourdomain.com with your domain
deploy.sh                 → Run once on fresh VPS: bash deploy.sh
README.md                 → Full operations guide

==============================================================
  BACKEND — 34 files total
==============================================================

backend/Dockerfile                              → Multi-stage build
backend/package.json                            → All dependencies
backend/tsconfig.json                           → TypeScript config
backend/nest-cli.json                           → NestJS CLI config

backend/src/main.ts                             → App entry point
backend/src/app.module.ts        ★ UPDATED      → All modules registered

backend/src/entities/all-entities.ts            → All 14 TypeORM entities
backend/src/controllers/all-controllers.ts      → All user-facing controllers
backend/src/services/remaining-services.ts      → Wallets, KYC, Cycle, Address services
backend/src/modules/all-modules.ts              → All NestJS module wiring files

── AUTH ──
backend/src/modules/auth/auth.service.ts        → Register, login, 2FA, reset
backend/src/modules/auth/auth.controller.ts     → All auth endpoints
backend/src/modules/auth/auth.dto.ts            → Validation DTOs
backend/src/modules/auth/auth.module.ts         → Module wiring
backend/src/modules/auth/guards/jwt-auth.guard.ts
backend/src/modules/auth/strategies/jwt.strategy.ts

── CORE SERVICES ──
backend/src/modules/users/users.entity.ts       → User TypeORM entity
backend/src/modules/users/users.service.ts      → User state transitions
backend/src/modules/users/withdrawal-address.controller.ts  ★ NEW  → Address update endpoint

backend/src/modules/deposits/deposits.service.ts  ★ UPDATED  → PaymentEvent recording added
backend/src/modules/withdrawals/withdrawals.service.ts  ★ UPDATED  → GRACE bug fixed, SQL bug fixed, loyalty trigger added
backend/src/modules/ledger/ledger.service.ts    → Immutable double-entry ledger

── ENGINES ──
backend/src/modules/roi/roi.service.ts          ★ UPDATED   → Holiday exclusion added, DataSource injected
backend/src/modules/referrals/referrals.service.ts  ★ UPDATED  → Referral limit enforced, self-referral blocked
backend/src/modules/loyalty/loyalty.service.ts  ★ UPDATED   → PaymentEvents used, timeframe averages fixed, recalc triggers added
backend/src/modules/rank/rank.service.ts        → Rank evaluation (unchanged)

── NEW MODULE ──
backend/src/modules/reinvestment/reinvestment.service.ts  ★ NEW  → Full reinvestment engine
backend/src/modules/reinvestment/reinvestment.module.ts   ★ NEW  → Module wiring

── SUPPORT ──
backend/src/modules/admin/admin.service.ts      → Full admin operations
backend/src/modules/email/email.service.ts      → All 10 email templates
backend/src/modules/notifications/notifications.service.ts
backend/src/modules/cycle/cycle.service.ts      → (in remaining-services.ts)

==============================================================
  FRONTEND — 46 files total
==============================================================

frontend/Dockerfile
frontend/package.json
frontend/next.config.js
frontend/tailwind.config.js
frontend/tsconfig.json
frontend/postcss.config.js

── SHARED ──
frontend/src/app/globals.css                    → All CSS variables, component classes
frontend/src/app/layout.tsx                     → Root layout with toast provider
frontend/src/lib/api.ts              ★ UPDATED  → Added reinvestAPI
frontend/src/store/auth.store.ts                → Zustand auth + admin store

── COMPONENTS ──
frontend/src/components/ui.tsx                  → StatusBadge, ProgressBar, StateBanner, fmt helpers, BottomNav (KEPT for imports)
frontend/src/components/Header.tsx   ★ NEW      → Header with bell → slide-down overlay (USE THIS, not ui.tsx's Header)
frontend/src/components/NotificationPanel.tsx   ★ NEW → Slide-down notification overlay component

── USER SCREENS ──
frontend/src/app/page.tsx                       → Landing page (re-exports LandingPage)
frontend/src/app/login/page.tsx                 → Login (re-exports LoginPage)
frontend/src/app/register/page.tsx              → Register (re-exports RegisterPage)
frontend/src/app/verify-email/page.tsx          → Email verification with OTP input
frontend/src/app/forgot-password/page.tsx       → Password reset request
frontend/src/app/reset-password/page.tsx        → Set new password with token

frontend/src/app/dashboard/page.tsx  ★ UPDATED → Reinvest modal, View Details modal, correct ROI banner
frontend/src/app/deposit/page.tsx    ★ UPDATED → QR code added to Step 3
frontend/src/app/withdraw/page.tsx              → All 8 gate checks (unchanged)
frontend/src/app/earn/earn-screens.tsx  ★ UPDATED → Promotion button (rank≥3), Referral Dashboard, View Rewards, Loyalty breakdown
frontend/src/app/earn/page.tsx                  → Route file
frontend/src/app/profile/page.tsx               → Profile + KYC screen
frontend/src/app/kyc/page.tsx                   → Route file
frontend/src/app/notifications/page.tsx         → Route file (kept — fallback full page)
frontend/src/app/transactions/page.tsx          → Transaction history

── SECURITY ──
frontend/src/app/security/2fa/page.tsx          → 2FA setup and disable
frontend/src/app/security/password/page.tsx     → Change password
frontend/src/app/security/address/page.tsx      → Update withdrawal address

── ADMIN SCREENS ──
frontend/src/app/admin/page.tsx                 → Overview (re-exports AdminOverviewPage)
frontend/src/app/admin/login/page.tsx           → Admin login
frontend/src/app/admin/deposits/page.tsx        → Pending deposits queue
frontend/src/app/admin/withdrawals/page.tsx     → Pending withdrawals queue
frontend/src/app/admin/kyc/page.tsx             → KYC review
frontend/src/app/admin/users/page.tsx           → User list with filters
frontend/src/app/admin/users/[id]/page.tsx      → User detail + freeze/unfreeze
frontend/src/app/admin/roi/page.tsx             → ROI rate input + manual run
frontend/src/app/admin/audit/page.tsx           → Immutable audit log

frontend/src/app/(auth)/auth-screens.tsx        → LandingPage, RegisterPage, VerifyEmailPage, LoginPage
frontend/src/app/admin/admin-screens.tsx        → AdminLoginPage, AdminOverviewPage, AdminDepositsPage, AdminWithdrawalsPage, AdminROIPage

==============================================================
  WHAT CHANGED IN THE PATCH (vs lianka-complete.zip)
==============================================================

★ NEW FILES (4 new files — deploy these, they didn't exist before):
  backend/src/modules/reinvestment/reinvestment.service.ts
  backend/src/modules/reinvestment/reinvestment.module.ts
  backend/src/modules/users/withdrawal-address.controller.ts
  frontend/src/components/Header.tsx
  frontend/src/components/NotificationPanel.tsx
  database/patch_001.sql

★ UPDATED FILES (9 files changed — overwrite old versions with these):
  backend/src/app.module.ts                          (ReinvestmentModule registered)
  backend/src/modules/deposits/deposits.service.ts   (PaymentEvent recording)
  backend/src/modules/withdrawals/withdrawals.service.ts  (GRACE fix, SQL fix, loyalty trigger)
  backend/src/modules/roi/roi.service.ts             (holiday exclusion, DataSource)
  backend/src/modules/referrals/referrals.service.ts (referral limit, self-referral block)
  backend/src/modules/loyalty/loyalty.service.ts     (PaymentEvents, timeframe avg, triggers)
  frontend/src/app/dashboard/page.tsx                (Reinvest, View Details)
  frontend/src/app/deposit/page.tsx                  (QR code)
  frontend/src/app/earn/earn-screens.tsx             (Apply for Promotion, Referral Dashboard)
  frontend/src/lib/api.ts                            (reinvestAPI added)

==============================================================
  DEPLOY SEQUENCE (fresh VPS)
==============================================================

Step 1: Upload
  scp -r lianka/ root@YOUR_VPS_IP:/opt/lianka

Step 2: Configure
  cp /opt/lianka/.env.example /opt/lianka/.env
  nano /opt/lianka/.env           ← fill all values

Step 3: Update nginx domain
  nano /opt/lianka/nginx/nginx.conf  ← replace yourdomain.com (3 places)

Step 4: Deploy
  cd /opt/lianka
  bash deploy.sh                  ← installs Docker, gets SSL, starts all containers

Step 5: Run database patches
  docker exec lianka_postgres psql -U lianka_user -d lianka \
    -f /docker-entrypoint-initdb.d/patch_001.sql

  NOTE: schema.sql runs automatically on first container start via
  docker-entrypoint-initdb.d/. Only patch_001 needs manual run.

Step 6: Verify
  docker compose ps               ← all 5 containers should be Up
  curl https://yourdomain.com/api/health
  → {"status":"ok","timestamp":"..."}

Step 7: Create admin account
  curl -X POST https://yourdomain.com/api/admin/init \
    -H "Content-Type: application/json" \
    -d '{"email":"bcebrain@gmail.com","password":"YOUR_ADMIN_PASS","full_name":"Super Admin"}'

Step 8: Access admin panel
  URL: https://yourdomain.com/admin
  Email: bcebrain@gmail.com
  Password: your INITIAL_ADMIN_PASSWORD from .env

==============================================================
  DAILY OPERATIONS REFERENCE
==============================================================

Approve deposit:
  Admin → /admin/deposits → Verify TXID on blockchain explorer → Approve

Complete withdrawal:
  Admin → /admin/withdrawals → Send from Trust Wallet → Paste TXID → Mark Complete

Run ROI:
  Automatic: Mon–Fri midnight UTC (cron job)
  Manual: Admin → /admin/roi → Set rates → Run for date

Add holiday:
  INSERT INTO roi_holidays (date, label) VALUES ('2026-12-25', 'Christmas');

Backup database:
  docker exec lianka_postgres pg_dump -U lianka_user lianka > backup_$(date +%Y%m%d).sql

==============================================================
  TRUST WALLET ADDRESSES (hardcoded in platform_config table)
==============================================================

TRC20: TDFeZPisd4Rs31pkVCPGhz6QB6Y349jqHQ
BEP20: 0x1c9E87A2bE00A7bE0D76aEc122c2774DF996462D
Email: bcebrain@gmail.com
