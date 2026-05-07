-- ============================================================
-- LIANKA — PATCH 001: Missing tables + loyalty fixes
-- Run AFTER schema.sql on first deploy, or as migration
-- ============================================================

-- ─── PaymentEvent table (spec 8 — redeposit tracking) ───
-- Tracks each time a user successfully redeposited after a
-- cycle completed (GRACE state). Used for loyalty scoring.
CREATE TABLE IF NOT EXISTS payment_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),
  event_type      TEXT NOT NULL CHECK (event_type IN ('REDEPOSIT', 'ON_TIME_REDEPOSIT', 'MISSED_REDEPOSIT')),
  cycle_number    INT NOT NULL,
  deposit_id      UUID REFERENCES deposits(id),
  grace_end_date  TIMESTAMPTZ,          -- what the deadline was
  redeposit_date  TIMESTAMPTZ,          -- when they actually redeposited (null if missed)
  days_before_end INT,                  -- positive = redeposited early, 0 = last day, null = missed
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_events_user_id ON payment_events(user_id);
CREATE INDEX idx_payment_events_type ON payment_events(event_type);

-- ─── WithdrawalRecord table (confirmed history) ──────────
-- Separate from withdrawal_requests. Immutable record of
-- completed transfers actually sent from Trust Wallet.
CREATE TABLE IF NOT EXISTS withdrawal_records (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  withdrawal_id    UUID NOT NULL REFERENCES withdrawals(id),
  user_id          UUID NOT NULL REFERENCES users(id),
  amount_sent      NUMERIC(18,8) NOT NULL,
  txid             TEXT NOT NULL,
  network          TEXT NOT NULL,
  to_address       TEXT NOT NULL,
  confirmed_by     UUID REFERENCES admin_users(id),
  confirmed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_withdrawal_records_user_id ON withdrawal_records(user_id);
CREATE UNIQUE INDEX idx_withdrawal_records_txid ON withdrawal_records(txid);

-- ─── Holiday config table ──────────────────────────────
CREATE TABLE IF NOT EXISTS roi_holidays (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date        DATE NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  created_by  UUID REFERENCES admin_users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Reinvestment log ─────────────────────────────────
CREATE TABLE IF NOT EXISTS reinvestment_logs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES users(id),
  amount                NUMERIC(18,8) NOT NULL,
  active_deposit_before NUMERIC(18,8) NOT NULL,
  active_deposit_after  NUMERIC(18,8) NOT NULL,
  total_profit_after    NUMERIC(18,8) NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reinvestment_logs_user_id ON reinvestment_logs(user_id);
