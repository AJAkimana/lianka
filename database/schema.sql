-- ============================================================
-- LIANKA INVESTMENT PLATFORM — COMPLETE DATABASE SCHEMA
-- Version 1.0 | Institutional Grade | Manual Ledger System
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS TABLE — Core identity and account state
-- ============================================================
CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                 TEXT UNIQUE NOT NULL,
  password_hash         TEXT NOT NULL,
  full_name             TEXT,

  -- Account lifecycle state
  account_state         TEXT NOT NULL DEFAULT 'INACTIVE'
                        CHECK (account_state IN ('ACTIVE','GRACE','INACTIVE','TERMINATED','FROZEN')),

  -- KYC state machine
  kyc_status            TEXT NOT NULL DEFAULT 'REQUIRED'
                        CHECK (kyc_status IN ('REQUIRED','SUBMITTED','VERIFIED','REJECTED','NOT_REQUIRED')),

  -- Financial core fields (ledger reference points)
  principal             NUMERIC(18,8) NOT NULL DEFAULT 0,     -- locked deposit reference, never changes except on deposit
  active_deposit        NUMERIC(18,8) NOT NULL DEFAULT 0,     -- ROI base (principal + reinvested profit)
  total_profit          NUMERIC(18,8) NOT NULL DEFAULT 0,     -- accumulated ROI minus withdrawn profit
  total_balance         NUMERIC(18,8) NOT NULL DEFAULT 0,     -- active_deposit + total_profit

  -- Cycle tracking
  timeframe             TEXT NOT NULL DEFAULT 'DAILY'
                        CHECK (timeframe IN ('DAILY','BIWEEKLY','40D','90D','180D')),
  cycle_start_date      TIMESTAMPTZ,
  grace_end_date        TIMESTAMPTZ,
  completed_cycles      INT NOT NULL DEFAULT 0,
  trading_days_count    INT NOT NULL DEFAULT 0,
  last_roi_date         DATE,
  next_withdrawal_date  DATE,

  -- Withdrawal scheduling
  breach_count          INT NOT NULL DEFAULT 0,               -- times principal was breached

  -- Rank system
  rank                  TEXT NOT NULL DEFAULT 'New Member'
                        CHECK (rank IN ('New Member','Contributor','Builder','Growth Partner','Strategic Partner','Elite Contributor')),
  rank_level            INT NOT NULL DEFAULT 1
                        CHECK (rank_level BETWEEN 1 AND 6),

  -- Loyalty score (0-100)
  loyalty_score         NUMERIC(5,2) NOT NULL DEFAULT 10.00
                        CHECK (loyalty_score >= 0 AND loyalty_score <= 100),

  -- Referral system
  referral_code         TEXT UNIQUE,                          -- this user's own referral code
  referred_by           UUID REFERENCES users(id),            -- referrer user id (permanent, never changes)

  -- Security
  two_fa_secret         TEXT,                                 -- TOTP secret (null if 2FA not enabled)
  two_fa_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  email_verify_token    TEXT,
  email_verify_code     TEXT,
  email_verify_expires  TIMESTAMPTZ,
  password_reset_token  TEXT,
  password_reset_expires TIMESTAMPTZ,
  last_login_at         TIMESTAMPTZ,
  last_login_ip         TEXT,

  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_account_state ON users(account_state);
CREATE INDEX idx_users_referred_by ON users(referred_by);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_kyc_status ON users(kyc_status);

-- ============================================================
-- 2. WALLETS TABLE — Three wallet types per user
-- ============================================================
CREATE TABLE wallets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_type   TEXT NOT NULL CHECK (wallet_type IN ('profit','referral','promotion')),
  balance       NUMERIC(18,8) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, wallet_type)
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);

-- ============================================================
-- 3. DEPOSITS TABLE — Manual deposit submissions
-- ============================================================
CREATE TABLE deposits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),

  amount          NUMERIC(18,8) NOT NULL CHECK (amount > 0),
  network         TEXT NOT NULL CHECK (network IN ('TRC20','BEP20')),
  txid            TEXT NOT NULL,                              -- user-submitted transaction ID
  plan            TEXT NOT NULL DEFAULT 'DAILY'
                  CHECK (plan IN ('DAILY','BIWEEKLY','40D','90D','180D')),

  status          TEXT NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','APPROVED','REJECTED')),

  -- Admin action tracking
  reviewed_by     UUID REFERENCES users(id),                 -- admin user id
  reviewed_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  admin_notes     TEXT,

  -- Duplicate protection
  is_duplicate    BOOLEAN NOT NULL DEFAULT FALSE,

  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_deposits_txid ON deposits(txid);    -- prevent duplicate TXID
CREATE INDEX idx_deposits_user_id ON deposits(user_id);
CREATE INDEX idx_deposits_status ON deposits(status);

-- ============================================================
-- 4. WITHDRAWALS TABLE — Manual withdrawal requests
-- ============================================================
CREATE TABLE withdrawals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),

  wallet_type     TEXT NOT NULL CHECK (wallet_type IN ('profit','referral','promotion')),
  amount          NUMERIC(18,8) NOT NULL CHECK (amount > 0),
  network_fee     NUMERIC(18,8) NOT NULL DEFAULT 2.10,       -- estimated network fee
  final_amount    NUMERIC(18,8) NOT NULL,                    -- amount - network_fee
  termination_fee NUMERIC(18,8) NOT NULL DEFAULT 0,         -- 30% if loyalty < 80 on termination

  address         TEXT NOT NULL,
  network         TEXT NOT NULL CHECK (network IN ('TRC20','BEP20')),

  status          TEXT NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','APPROVED','PROCESSING','COMPLETED','REJECTED','CANCELLED')),

  -- Admin action tracking
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  rejection_reason TEXT,
  admin_notes     TEXT,
  txid_sent       TEXT,                                      -- TX hash admin uses when sending

  -- Snapshot at time of request (immutable audit record)
  snapshot_profit_balance   NUMERIC(18,8),
  snapshot_total_balance    NUMERIC(18,8),
  snapshot_principal        NUMERIC(18,8),
  snapshot_loyalty_score    NUMERIC(5,2),

  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_withdrawals_requested_at ON withdrawals(requested_at);

-- ============================================================
-- 5. LEDGER ENTRIES — Immutable double-entry audit trail
-- ============================================================
CREATE TABLE ledger_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),

  -- Reference to source event
  reference_type  TEXT NOT NULL,                             -- DEPOSIT, WITHDRAWAL, ROI, REFERRAL_BONUS, PROMOTION_BONUS, REINVESTMENT, TERMINATION_FEE
  reference_id    UUID NOT NULL,                             -- id of the source record

  entry_type      TEXT NOT NULL CHECK (entry_type IN ('CREDIT','DEBIT')),
  wallet_type     TEXT NOT NULL CHECK (wallet_type IN ('profit','referral','promotion')),

  amount          NUMERIC(18,8) NOT NULL CHECK (amount > 0),
  balance_before  NUMERIC(18,8) NOT NULL,
  balance_after   NUMERIC(18,8) NOT NULL,

  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ledger is append-only — no updates or deletes ever
CREATE INDEX idx_ledger_user_id ON ledger_entries(user_id);
CREATE INDEX idx_ledger_reference ON ledger_entries(reference_type, reference_id);
CREATE INDEX idx_ledger_created_at ON ledger_entries(created_at);

-- ============================================================
-- 6. ROI RATES TABLE — Admin-set daily rates per timeframe
-- ============================================================
CREATE TABLE roi_rates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date        DATE NOT NULL,
  timeframe   TEXT NOT NULL CHECK (timeframe IN ('DAILY','BIWEEKLY','40D','90D','180D')),
  rate        NUMERIC(8,4) NOT NULL                          -- e.g. 0.2000 for 0.20%
              CHECK (rate > 0),

  set_by      UUID REFERENCES users(id),                    -- admin who set it
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (date, timeframe)
);

-- Rate limits enforced at application layer:
-- DAILY max: 0.20, BIWEEKLY max: 0.50, 40D max: 1.00, 90D max: 1.20, 180D max: 1.50

CREATE INDEX idx_roi_rates_date ON roi_rates(date);

-- ============================================================
-- 7. ROI LOG — Per-user daily ROI application record
-- ============================================================
CREATE TABLE roi_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),

  date            DATE NOT NULL,
  timeframe       TEXT NOT NULL,
  rate_applied    NUMERIC(8,4) NOT NULL,
  active_deposit  NUMERIC(18,8) NOT NULL,                   -- snapshot at time of calculation
  profit_earned   NUMERIC(18,8) NOT NULL,

  total_profit_after  NUMERIC(18,8) NOT NULL,
  total_balance_after NUMERIC(18,8) NOT NULL,

  triggered_grace BOOLEAN NOT NULL DEFAULT FALSE,           -- did this ROI trigger GRACE?
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, date)                                    -- double-execution protection
);

CREATE INDEX idx_roi_logs_date ON roi_logs(date);
CREATE INDEX idx_roi_logs_user_id ON roi_logs(user_id);

-- ============================================================
-- 8. CYCLES TABLE — Full cycle lifecycle records
-- ============================================================
CREATE TABLE cycles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id),

  cycle_number      INT NOT NULL DEFAULT 1,
  plan              TEXT NOT NULL,
  deposit_amount    NUMERIC(18,8) NOT NULL,                 -- principal for this cycle
  peak_balance      NUMERIC(18,8) NOT NULL DEFAULT 0,       -- highest total_balance reached
  profit_earned     NUMERIC(18,8) NOT NULL DEFAULT 0,       -- total ROI in this cycle
  profit_withdrawn  NUMERIC(18,8) NOT NULL DEFAULT 0,       -- total withdrawn in this cycle

  status            TEXT NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE','GRACE','COMPLETED','TERMINATED')),

  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  grace_started_at  TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cycles_user_id ON cycles(user_id);
CREATE INDEX idx_cycles_status ON cycles(status);

-- ============================================================
-- 9. REFERRALS TABLE — Permanent referrer/referred links
-- ============================================================
CREATE TABLE referrals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id     UUID NOT NULL REFERENCES users(id),
  referred_id     UUID NOT NULL REFERENCES users(id),

  status          TEXT NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','ACTIVE','INACTIVE')),
                  -- PENDING = joined but no deposit yet
                  -- ACTIVE = has at least one confirmed deposit
                  -- INACTIVE = was active but deposit cycle ended

  total_deposit_bonus   NUMERIC(18,8) NOT NULL DEFAULT 0,   -- lifetime deposit bonuses earned from this referral
  total_roi_bonus       NUMERIC(18,8) NOT NULL DEFAULT 0,   -- lifetime daily ROI bonuses earned

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at    TIMESTAMPTZ,                              -- when first deposit confirmed

  UNIQUE (referred_id)                                      -- one referrer per user, permanent
);

CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX idx_referrals_status ON referrals(status);

-- ============================================================
-- 10. REFERRAL EARNINGS — Individual bonus event records
-- ============================================================
CREATE TABLE referral_earnings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_id     UUID NOT NULL REFERENCES referrals(id),
  referrer_id     UUID NOT NULL REFERENCES users(id),
  referred_id     UUID NOT NULL REFERENCES users(id),

  earning_type    TEXT NOT NULL CHECK (earning_type IN ('DEPOSIT_BONUS','ROI_BONUS')),
  amount          NUMERIC(18,8) NOT NULL CHECK (amount > 0),
  source_amount   NUMERIC(18,8) NOT NULL,                   -- deposit amount or daily profit that triggered it
  rate_applied    NUMERIC(8,4) NOT NULL,                    -- 2.00 for deposit, 0.10 for ROI

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referral_earnings_referrer_id ON referral_earnings(referrer_id);
CREATE INDEX idx_referral_earnings_referral_id ON referral_earnings(referral_id);

-- ============================================================
-- 11. KYC DOCUMENTS — Identity verification submissions
-- ============================================================
CREATE TABLE kyc_documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),

  document_type   TEXT NOT NULL CHECK (document_type IN ('PASSPORT','NATIONAL_ID','DRIVERS_LICENSE')),
  front_image_url TEXT,
  back_image_url  TEXT,
  selfie_url      TEXT,

  full_name       TEXT,
  date_of_birth   DATE,
  document_number TEXT,
  nationality     TEXT,

  status          TEXT NOT NULL DEFAULT 'SUBMITTED'
                  CHECK (status IN ('SUBMITTED','APPROVED','REJECTED')),

  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  admin_notes     TEXT,

  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kyc_user_id ON kyc_documents(user_id);
CREATE INDEX idx_kyc_status ON kyc_documents(status);

-- ============================================================
-- 12. WITHDRAWAL ADDRESSES — Per-user per-network saved address
-- ============================================================
CREATE TABLE withdrawal_addresses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),
  network         TEXT NOT NULL CHECK (network IN ('TRC20','BEP20')),
  address         TEXT NOT NULL,
  is_verified     BOOLEAN NOT NULL DEFAULT TRUE,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_update_allowed_at TIMESTAMPTZ,                       -- 24-hour cooldown
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, network)
);

CREATE INDEX idx_withdrawal_addresses_user_id ON withdrawal_addresses(user_id);

-- ============================================================
-- 13. NOTIFICATIONS — In-app notification records
-- ============================================================
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),

  type            TEXT NOT NULL,
  -- ROI_APPLIED, WITHDRAWAL_APPROVED, WITHDRAWAL_COMPLETED, WITHDRAWAL_FAILED,
  -- WITHDRAWAL_REJECTED, DEPOSIT_CONFIRMED, DEPOSIT_REJECTED, CYCLE_COMPLETED,
  -- GRACE_WARNING, ACCOUNT_DEACTIVATED, ACCOUNT_TERMINATED, REFERRAL_JOINED,
  -- REFERRAL_DEPOSITED, RANK_CHANGED, PROMOTION_EARNED, KYC_APPROVED, KYC_REJECTED,
  -- SYSTEM_ALERT

  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  dot_color       TEXT NOT NULL DEFAULT 'green',            -- green, blue, yellow, red, purple, gray
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  is_critical     BOOLEAN NOT NULL DEFAULT FALSE,           -- critical = cannot be dismissed by user settings
  metadata        JSONB,                                    -- flexible extra data (amount, txid, etc)

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- ============================================================
-- 14. LOYALTY SCORES — Daily snapshot + component breakdown
-- ============================================================
CREATE TABLE loyalty_snapshots (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES users(id),
  date                    DATE NOT NULL,

  -- Component scores (raw values before weighting)
  completed_cycles_score  NUMERIC(5,2) NOT NULL DEFAULT 0,  -- weight 35%
  redeposit_score         NUMERIC(5,2) NOT NULL DEFAULT 0,  -- weight 20%
  no_breach_score         NUMERIC(5,2) NOT NULL DEFAULT 0,  -- weight 20%
  timeframe_score         NUMERIC(5,2) NOT NULL DEFAULT 0,  -- weight 10%
  account_age_score       NUMERIC(5,2) NOT NULL DEFAULT 0,  -- weight 5%
  referral_quality_score  NUMERIC(5,2) NOT NULL DEFAULT 0,  -- weight 5%
  promotion_score         NUMERIC(5,2) NOT NULL DEFAULT 0,  -- weight 5%

  -- Final weighted score
  total_score             NUMERIC(5,2) NOT NULL DEFAULT 0,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, date)
);

CREATE INDEX idx_loyalty_user_id ON loyalty_snapshots(user_id);
CREATE INDEX idx_loyalty_date ON loyalty_snapshots(date);

-- ============================================================
-- 15. RANK HISTORY — Permanent rank progression records
-- ============================================================
CREATE TABLE rank_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id),
  rank        TEXT NOT NULL,
  rank_level  INT NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rank_history_user_id ON rank_history(user_id);

-- ============================================================
-- 16. PROMOTIONS — Admin-issued promotion bonuses
-- ============================================================
CREATE TABLE promotions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),

  title           TEXT NOT NULL,
  description     TEXT,
  amount          NUMERIC(18,8) NOT NULL CHECK (amount > 0),
  percent_of_deposit NUMERIC(5,2),                          -- e.g. 5.00 for 5%

  status          TEXT NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE','EXPIRED','CANCELLED')),

  issued_by       UUID REFERENCES users(id),
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_promotions_user_id ON promotions(user_id);

-- ============================================================
-- 17. ADMIN USERS — Separate admin identity + roles
-- ============================================================
CREATE TABLE admin_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id),                  -- linked platform account if any
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,

  role          TEXT NOT NULL DEFAULT 'SUPPORT'
                CHECK (role IN ('SUPER_ADMIN','FINANCE_ADMIN','KYC_ADMIN','SUPPORT_ADMIN')),

  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  two_fa_secret TEXT,
  two_fa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  last_login_ip TEXT,

  created_by    UUID REFERENCES admin_users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 18. ADMIN LOGS — Immutable audit trail of every admin action
-- ============================================================
CREATE TABLE admin_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id        UUID NOT NULL REFERENCES admin_users(id),

  action          TEXT NOT NULL,
  -- APPROVE_DEPOSIT, REJECT_DEPOSIT, APPROVE_WITHDRAWAL, REJECT_WITHDRAWAL,
  -- COMPLETE_WITHDRAWAL, APPROVE_KYC, REJECT_KYC, SET_ROI_RATE, RUN_ROI_ENGINE,
  -- FREEZE_ACCOUNT, UNFREEZE_ACCOUNT, RESET_CYCLE, ISSUE_PROMOTION,
  -- UPDATE_LOYALTY, UPDATE_RANK, CREATE_ADMIN, DEACTIVATE_ADMIN

  target_type     TEXT NOT NULL,                            -- USER, DEPOSIT, WITHDRAWAL, KYC, ROI
  target_id       UUID,                                     -- id of the affected record

  before_state    JSONB,                                    -- snapshot before action
  after_state     JSONB,                                    -- snapshot after action

  notes           TEXT,
  ip_address      TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin logs are NEVER updated or deleted
CREATE INDEX idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_target ON admin_logs(target_type, target_id);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at);

-- ============================================================
-- 19. PLATFORM CONFIG — System-wide settings
-- ============================================================
CREATE TABLE platform_config (
  key           TEXT PRIMARY KEY,
  value         TEXT NOT NULL,
  description   TEXT,
  updated_by    UUID REFERENCES admin_users(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default platform config
INSERT INTO platform_config (key, value, description) VALUES
('DEPOSIT_ADDRESS_TRC20', 'TDFeZPisd4Rs31pkVCPGhz6QB6Y349jqHQ', 'Company TRC20 USDT deposit address'),
('DEPOSIT_ADDRESS_BEP20', '0x1c9E87A2bE00A7bE0D76aEc122c2774DF996462D', 'Company BEP20 USDT deposit address'),
('MIN_DEPOSIT_USDT', '100', 'Minimum deposit amount in USDT'),
('MIN_WITHDRAWAL_USDT', '10', 'Minimum withdrawal amount in USDT'),
('NETWORK_FEE_USDT', '2.10', 'Estimated network fee per withdrawal'),
('GRACE_PERIOD_DAYS', '10', 'Days before GRACE transitions to INACTIVE'),
('TERMINATION_FEE_PERCENT', '30', 'Fee percent on termination if loyalty < 80'),
('LOYALTY_FEE_WAIVER_THRESHOLD', '80', 'Loyalty score above which termination fee is waived'),
('REFERRAL_DEPOSIT_BONUS_PERCENT', '2', 'Deposit bonus percent for referrers'),
('REFERRAL_ROI_BONUS_PERCENT', '0.1', 'Daily ROI bonus percent for referrers'),
('MAX_REFERRALS_DEFAULT', '5', 'Default referral limit before rank 3'),
('ROI_ENGINE_RUNNING', 'false', 'Whether ROI engine is actively running'),
('DEPOSITS_PAUSED', 'false', 'Emergency: pause all deposits'),
('WITHDRAWALS_PAUSED', 'false', 'Emergency: pause all withdrawals'),
('PLATFORM_MAINTENANCE', 'false', 'Maintenance mode flag');

-- ============================================================
-- 20. EMAIL LOGS — Track all outbound emails
-- ============================================================
CREATE TABLE email_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  to_email    TEXT NOT NULL,
  subject     TEXT NOT NULL,
  template    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT','FAILED','BOUNCED')),
  error       TEXT,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);

-- ============================================================
-- TRIGGERS — Auto-update updated_at timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- VIEWS — Pre-built for dashboard queries
-- ============================================================

-- User dashboard summary view
CREATE OR REPLACE VIEW user_dashboard AS
SELECT
  u.id,
  u.email,
  u.full_name,
  u.account_state,
  u.kyc_status,
  u.principal,
  u.active_deposit,
  u.total_profit,
  u.total_balance,
  u.timeframe,
  u.cycle_start_date,
  u.grace_end_date,
  u.completed_cycles,
  u.trading_days_count,
  u.next_withdrawal_date,
  u.rank,
  u.rank_level,
  u.loyalty_score,
  u.referral_code,
  u.two_fa_enabled,
  -- Wallet balances
  COALESCE(pw.balance, 0) AS profit_wallet_balance,
  COALESCE(rw.balance, 0) AS referral_wallet_balance,
  COALESCE(pmw.balance, 0) AS promotion_wallet_balance,
  -- Cycle progress
  CASE
    WHEN u.principal > 0
    THEN ROUND((u.total_balance / (u.principal * 2)) * 100, 2)
    ELSE 0
  END AS cycle_progress_percent,
  -- Referral counts
  COALESCE(ref_counts.total_referrals, 0) AS total_referrals,
  COALESCE(ref_counts.active_referrals, 0) AS active_referrals
FROM users u
LEFT JOIN wallets pw ON pw.user_id = u.id AND pw.wallet_type = 'profit'
LEFT JOIN wallets rw ON rw.user_id = u.id AND rw.wallet_type = 'referral'
LEFT JOIN wallets pmw ON pmw.user_id = u.id AND pmw.wallet_type = 'promotion'
LEFT JOIN (
  SELECT
    referrer_id,
    COUNT(*) AS total_referrals,
    COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_referrals
  FROM referrals
  GROUP BY referrer_id
) ref_counts ON ref_counts.referrer_id = u.id;

-- Admin global overview
CREATE OR REPLACE VIEW admin_overview AS
SELECT
  COUNT(*) AS total_users,
  COUNT(*) FILTER (WHERE account_state = 'ACTIVE') AS active_users,
  COUNT(*) FILTER (WHERE account_state = 'GRACE') AS grace_users,
  COUNT(*) FILTER (WHERE account_state = 'INACTIVE') AS inactive_users,
  COUNT(*) FILTER (WHERE account_state = 'TERMINATED') AS terminated_users,
  COUNT(*) FILTER (WHERE account_state = 'FROZEN') AS frozen_users,
  SUM(active_deposit) AS total_aum,
  SUM(total_profit) AS total_profit_on_platform,
  SUM(total_balance) AS total_balance_on_platform
FROM users;

-- Pending actions view for admin
CREATE OR REPLACE VIEW admin_pending_actions AS
SELECT 'DEPOSIT' AS action_type, id AS item_id, user_id, amount, created_at
FROM deposits WHERE status = 'PENDING'
UNION ALL
SELECT 'WITHDRAWAL', id, user_id, amount, requested_at
FROM withdrawals WHERE status = 'PENDING'
UNION ALL
SELECT 'KYC', id, user_id, NULL, submitted_at
FROM kyc_documents WHERE status = 'SUBMITTED'
ORDER BY created_at ASC;
