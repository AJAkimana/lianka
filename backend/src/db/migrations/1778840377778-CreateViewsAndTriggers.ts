import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateViewsAndTriggers1778840377778 implements MigrationInterface {
  name = 'CreateViewsAndTriggers1778840377778';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql`);

    await queryRunner.query(`DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'users_updated_at'
  ) THEN
    CREATE TRIGGER users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$`);

    await queryRunner.query(`DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'wallets_updated_at'
  ) THEN
    CREATE TRIGGER wallets_updated_at
      BEFORE UPDATE ON wallets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$`);

    await queryRunner.query(`DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'admin_users_updated_at'
  ) THEN
    CREATE TRIGGER admin_users_updated_at
      BEFORE UPDATE ON admin_users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$`);

    await queryRunner.query(`CREATE OR REPLACE VIEW user_dashboard AS
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
  COALESCE(pw.balance, 0) AS profit_wallet_balance,
  COALESCE(rw.balance, 0) AS referral_wallet_balance,
  COALESCE(pmw.balance, 0) AS promotion_wallet_balance,
  CASE
    WHEN u.principal > 0
    THEN ROUND((u.total_balance / (u.principal * 2)) * 100, 2)
    ELSE 0
  END AS cycle_progress_percent,
  COALESCE(ref_counts.total_referrals, 0) AS total_referrals,
  COALESCE(ref_counts.active_referrals, 0) AS active_referrals
FROM users u
LEFT JOIN wallets pw ON pw.user_id = u.id::text AND pw.wallet_type = 'profit'
LEFT JOIN wallets rw ON rw.user_id = u.id::text AND rw.wallet_type = 'referral'
LEFT JOIN wallets pmw ON pmw.user_id = u.id::text AND pmw.wallet_type = 'promotion'
LEFT JOIN (
  SELECT
    referrer_id,
    COUNT(*) AS total_referrals,
    COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_referrals
  FROM referrals
  GROUP BY referrer_id
) ref_counts ON ref_counts.referrer_id = u.id::text`);

    await queryRunner.query(`CREATE OR REPLACE VIEW admin_overview AS
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
FROM users`);

    await queryRunner.query(`CREATE OR REPLACE VIEW admin_pending_actions AS
SELECT 'DEPOSIT' AS action_type, id AS item_id, user_id, amount, created_at
FROM deposits WHERE status = 'PENDING'
UNION ALL
SELECT 'WITHDRAWAL', id, user_id, amount, requested_at
FROM withdrawals WHERE status = 'PENDING'
UNION ALL
SELECT 'KYC', id, user_id, NULL, submitted_at
FROM kyc_documents WHERE status = 'SUBMITTED'
ORDER BY created_at ASC`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS admin_pending_actions`);
    await queryRunner.query(`DROP VIEW IF EXISTS admin_overview`);
    await queryRunner.query(`DROP VIEW IF EXISTS user_dashboard`);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS admin_users_updated_at ON admin_users`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS wallets_updated_at ON wallets`,
    );
    await queryRunner.query(`DROP TRIGGER IF EXISTS users_updated_at ON users`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at()`);
  }
}
