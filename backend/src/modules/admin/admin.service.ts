import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUser } from '../../entities/admin-user.entity';
import { AdminLog } from '../../entities/admin-log.entity';
import { DepositsService } from '../deposits/deposits.service';
import { WithdrawalsService } from '../withdrawals/withdrawals.service';
import { RoiService } from '../roi/roi.service';
import { UsersService } from '../users/users.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { RankService } from '../rank/rank.service';
import { NotificationsService } from '../notifications/notifications.service';
import { KycService } from '../kyc/kyc.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AdminUser)
    private adminRepo: Repository<AdminUser>,
    @InjectRepository(AdminLog)
    private logRepo: Repository<AdminLog>,
    private depositsService: DepositsService,
    private withdrawalsService: WithdrawalsService,
    private kycService: KycService,
    private roiService: RoiService,
    private usersService: UsersService,
    private loyaltyService: LoyaltyService,
    private rankService: RankService,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
  ) {}

  // ─── Admin Auth ───────────────────────────────────────────

  async findAdminByEmail(email: string) {
    return this.adminRepo.findOne({ where: { email: email.toLowerCase() } });
  }

  async validateAdmin(email: string, password: string) {
    const admin = await this.findAdminByEmail(email);
    if (!admin || !admin.is_active) return null;
    const valid = await bcrypt.compare(password, admin.password_hash);
    return valid ? admin : null;
  }

  async createInitialAdmin(email: string, password: string, name: string) {
    const count = await this.adminRepo.count();
    if (count > 0) throw new ForbiddenException('Admin already initialized');

    const hash = await bcrypt.hash(password, 12);
    return this.adminRepo.save({
      email: email.toLowerCase(),
      password_hash: hash,
      full_name: name,
      role: 'SUPER_ADMIN',
    });
  }

  async createAdmin(
    dto: {
      email: string;
      password: string;
      full_name: string;
      role: string;
    },
    createdBy: string,
  ) {
    await this.assertRole(createdBy, ['SUPER_ADMIN']);
    const hash = await bcrypt.hash(dto.password, 12);
    const admin = await this.adminRepo.save({
      email: dto.email.toLowerCase(),
      password_hash: hash,
      full_name: dto.full_name,
      role: dto.role,
      created_by: createdBy,
    });
    await this.log(createdBy, 'CREATE_ADMIN', 'ADMIN', admin.id, null, {
      email: dto.email,
      role: dto.role,
    });
    return admin;
  }

  // ─── Dashboard / Overview ────────────────────────────────

  async getOverview() {
    const [overview] = await this.dataSource.query(
      `SELECT * FROM admin_overview`,
    );
    const pending = await this.dataSource.query(
      `SELECT * FROM admin_pending_actions LIMIT 50`,
    );
    const recentLogs = await this.logRepo.find({
      order: { created_at: 'DESC' },
      take: 20,
    });
    return { overview, pending, recentLogs };
  }

  // ─── Deposit management ──────────────────────────────────

  async getPendingDeposits() {
    return this.depositsService.findPending();
  }

  async approveDeposit(depositId: string, adminId: string, notes?: string) {
    await this.assertRole(adminId, ['SUPER_ADMIN', 'FINANCE_ADMIN']);
    const deposit = await this.depositsService.findById(depositId);
    const before = { ...deposit };
    const result = await this.depositsService.approve(
      depositId,
      adminId,
      notes,
    );
    await this.log(
      adminId,
      'APPROVE_DEPOSIT',
      'DEPOSIT',
      depositId,
      before,
      result,
    );
    return result;
  }

  async rejectDeposit(depositId: string, adminId: string, reason: string) {
    await this.assertRole(adminId, ['SUPER_ADMIN', 'FINANCE_ADMIN']);
    const deposit = await this.depositsService.findById(depositId);
    const before = { ...deposit };
    const result = await this.depositsService.reject(
      depositId,
      adminId,
      reason,
    );
    await this.log(adminId, 'REJECT_DEPOSIT', 'DEPOSIT', depositId, before, {
      reason,
    });
    return result;
  }

  // ─── Withdrawal management ───────────────────────────────

  async getPendingWithdrawals() {
    return this.dataSource.query(
      `SELECT w.*, u.email, u.full_name
       FROM withdrawals w
       JOIN users u ON u.id = w.user_id
       WHERE w.status = 'PENDING'
       ORDER BY w.requested_at ASC`,
    );
  }

  async approveWithdrawal(
    id: string,
    adminId: string,
    txid: string,
    notes?: string,
  ) {
    await this.assertRole(adminId, ['SUPER_ADMIN', 'FINANCE_ADMIN']);
    const before = await this.dataSource.query(
      `SELECT * FROM withdrawals WHERE id = $1`,
      [id],
    );
    const result = await this.withdrawalsService.adminApprove(
      id,
      adminId,
      txid,
      notes,
    );
    await this.log(adminId, 'APPROVE_WITHDRAWAL', 'WITHDRAWAL', id, before[0], {
      txid,
    });
    return result;
  }

  async rejectWithdrawal(id: string, adminId: string, reason: string) {
    await this.assertRole(adminId, ['SUPER_ADMIN', 'FINANCE_ADMIN']);
    const before = await this.dataSource.query(
      `SELECT * FROM withdrawals WHERE id = $1`,
      [id],
    );
    const result = await this.withdrawalsService.adminReject(
      id,
      adminId,
      reason,
    );
    await this.log(adminId, 'REJECT_WITHDRAWAL', 'WITHDRAWAL', id, before[0], {
      reason,
    });
    return result;
  }

  // ─── KYC management ──────────────────────────────────────

  async getPendingKYC() {
    return this.kycService.findPending();
  }

  async approveKYC(docId: string, adminId: string) {
    await this.assertRole(adminId, ['SUPER_ADMIN', 'KYC_ADMIN']);
    const result = await this.kycService.approve(docId, adminId);
    await this.log(adminId, 'APPROVE_KYC', 'KYC', docId, null, null);
    return result;
  }

  async rejectKYC(docId: string, adminId: string, reason: string) {
    await this.assertRole(adminId, ['SUPER_ADMIN', 'KYC_ADMIN']);
    const result = await this.kycService.reject(docId, adminId, reason);
    await this.log(adminId, 'REJECT_KYC', 'KYC', docId, null, { reason });
    return result;
  }

  // ─── ROI management ──────────────────────────────────────

  async setROIRate(
    date: string,
    timeframe: string,
    rate: number,
    adminId: string,
  ) {
    await this.assertRole(adminId, ['SUPER_ADMIN', 'FINANCE_ADMIN']);
    const result = await this.roiService.setRate(
      date,
      timeframe,
      rate,
      adminId,
    );
    await this.log(adminId, 'SET_ROI_RATE', 'ROI', null, null, {
      date,
      timeframe,
      rate,
    });
    return result;
  }

  async runROIEngine(date: string, adminId: string) {
    await this.assertRole(adminId, ['SUPER_ADMIN', 'FINANCE_ADMIN']);
    const result = await this.roiService.applyROIForDate(date, adminId);
    await this.log(adminId, 'RUN_ROI_ENGINE', 'ROI', null, null, {
      date,
      result,
    });
    return result;
  }

  // ─── User management ─────────────────────────────────────

  async getUsers(page = 1, limit = 50, filters?: any) {
    await this.assertRole(null, null); // all admins can view
    let query = `
      SELECT u.id, u.email, u.full_name, u.account_state, u.kyc_status,
             u.rank, u.loyalty_score, u.total_balance, u.active_deposit,
             u.total_profit, u.created_at
      FROM users u
      WHERE 1=1
    `;
    const params = [];
    if (filters?.state) {
      params.push(filters.state);
      query += ` AND u.account_state = $${params.length}`;
    }
    if (filters?.kyc) {
      params.push(filters.kyc);
      query += ` AND u.kyc_status = $${params.length}`;
    }
    if (filters?.search) {
      params.push(`%${filters.search}%`);
      query += ` AND (u.email ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`;
    }
    query += ` ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
    return this.dataSource.query(query, params);
  }

  async getUserDetail(userId: string) {
    const [user] = await this.dataSource.query(
      `SELECT * FROM user_dashboard WHERE id = $1`,
      [userId],
    );
    const deposits = await this.dataSource.query(
      `SELECT * FROM deposits WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [userId],
    );
    const withdrawals = await this.dataSource.query(
      `SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY requested_at DESC LIMIT 20`,
      [userId],
    );
    const ledger = await this.dataSource.query(
      `SELECT * FROM ledger_entries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId],
    );
    return { user, deposits, withdrawals, ledger };
  }

  async freezeUser(userId: string, adminId: string, reason: string) {
    await this.assertRole(adminId, ['SUPER_ADMIN']);
    const user = await this.usersService.findById(userId);
    const before = { account_state: user.account_state };
    user.account_state = 'FROZEN';
    await this.usersService.save(user);
    await this.notificationsService.create({
      user_id: userId,
      type: 'SYSTEM_ALERT',
      title: 'Account Frozen',
      message: 'Your account has been frozen. Contact support.',
      dot_color: 'red',
      is_critical: true,
    });
    await this.log(adminId, 'FREEZE_ACCOUNT', 'USER', userId, before, {
      reason,
    });
    return { message: 'Account frozen' };
  }

  async unfreezeUser(userId: string, adminId: string, reason: string) {
    await this.assertRole(adminId, ['SUPER_ADMIN']);
    const user = await this.usersService.findById(userId);
    const before = { account_state: user.account_state };
    user.account_state = 'INACTIVE';
    await this.usersService.save(user);
    await this.log(adminId, 'UNFREEZE_ACCOUNT', 'USER', userId, before, {
      reason,
    });
    return { message: 'Account unfrozen — set to INACTIVE' };
  }

  async resetCycle(userId: string, adminId: string, notes: string) {
    await this.assertRole(adminId, ['SUPER_ADMIN']);
    const user = await this.usersService.findById(userId);
    const before = {
      account_state: user.account_state,
      principal: user.principal,
      total_profit: user.total_profit,
    };
    user.account_state = 'INACTIVE';
    user.principal = 0;
    user.active_deposit = 0;
    user.total_profit = 0;
    user.total_balance = 0;
    user.cycle_start_date = null;
    user.grace_end_date = null;
    await this.usersService.save(user);
    await this.log(adminId, 'RESET_CYCLE', 'USER', userId, before, { notes });
    return { message: 'Cycle reset. User must make new deposit to restart.' };
  }

  async issuePromotion(
    userId: string,
    amount: number,
    title: string,
    adminId: string,
  ) {
    await this.assertRole(adminId, ['SUPER_ADMIN', 'FINANCE_ADMIN']);
    // Credit promotion wallet
    const result = await this.dataSource.query(
      `UPDATE wallets SET balance = balance + $1 WHERE user_id = $2 AND wallet_type = 'promotion' RETURNING *`,
      [amount, userId],
    );
    await this.dataSource.query(
      `INSERT INTO promotions (user_id, title, amount, issued_by) VALUES ($1, $2, $3, $4)`,
      [userId, title, amount, adminId],
    );
    await this.log(adminId, 'ISSUE_PROMOTION', 'USER', userId, null, {
      amount,
      title,
    });
    await this.notificationsService.create({
      user_id: userId,
      type: 'PROMOTION_EARNED',
      title: 'Promotion Bonus',
      message: `You received a promotion bonus of $${amount.toFixed(2)}: ${title}`,
      dot_color: 'purple',
    });
    return { message: `Promotion of $${amount} issued to user` };
  }

  async getAuditLog(page = 1, limit = 50) {
    return this.logRepo.find({
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  // ─── Emergency controls (SUPER_ADMIN only) ───────────────

  async emergencyPause(
    type: 'deposits' | 'withdrawals' | 'roi',
    adminId: string,
  ) {
    await this.assertRole(adminId, ['SUPER_ADMIN']);
    const keyMap = {
      deposits: 'DEPOSITS_PAUSED',
      withdrawals: 'WITHDRAWALS_PAUSED',
      roi: 'ROI_ENGINE_RUNNING',
    };
    await this.dataSource.query(
      `UPDATE platform_config SET value = 'true' WHERE key = $1`,
      [keyMap[type]],
    );
    await this.log(adminId, 'EMERGENCY_PAUSE', 'PLATFORM', null, null, {
      type,
    });
    return { message: `${type} paused platform-wide` };
  }

  async emergencyResume(
    type: 'deposits' | 'withdrawals' | 'roi',
    adminId: string,
  ) {
    await this.assertRole(adminId, ['SUPER_ADMIN']);
    const keyMap = {
      deposits: 'DEPOSITS_PAUSED',
      withdrawals: 'WITHDRAWALS_PAUSED',
      roi: 'ROI_ENGINE_RUNNING',
    };
    await this.dataSource.query(
      `UPDATE platform_config SET value = 'false' WHERE key = $1`,
      [keyMap[type]],
    );
    await this.log(adminId, 'EMERGENCY_RESUME', 'PLATFORM', null, null, {
      type,
    });
    return { message: `${type} resumed` };
  }

  // ─── Helpers ─────────────────────────────────────────────

  private async assertRole(
    adminId: string | null,
    allowedRoles: string[] | null,
  ) {
    if (!adminId || !allowedRoles) return;
    const admin = await this.adminRepo.findOne({ where: { id: adminId } });
    if (!admin || !allowedRoles.includes(admin.role)) {
      throw new ForbiddenException('Insufficient admin privileges');
    }
  }

  private async log(
    adminId: string,
    action: string,
    targetType: string,
    targetId: string | null,
    before: any,
    after: any,
    notes?: string,
  ) {
    await this.logRepo.save({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      before_state: before,
      after_state: after,
      notes,
    });
  }

  // ── NEW: Flag / Unflag User ──────────────────────────────
  async flagUser(userId: string, adminId: string, reason: string) {
    const before = await this.dataSource.query(
      `SELECT account_state, flags FROM users WHERE id = $1`,
      [userId],
    );
    await this.dataSource.query(
      `UPDATE users SET flags = COALESCE(flags, '[]'::jsonb) || $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [
        JSON.stringify([
          { reason, flagged_by: adminId, flagged_at: new Date() },
        ]),
        userId,
      ],
    );
    await this.log(adminId, 'FLAG_USER', 'USER', userId, before[0], { reason });
    return { success: true };
  }

  // ── NEW: Force Logout ────────────────────────────────────
  async forceLogout(userId: string, adminId: string) {
    await this.dataSource.query(
      `UPDATE users SET refresh_token = NULL, force_logout_at = NOW() WHERE id = $1`,
      [userId],
    );
    await this.log(adminId, 'FORCE_LOGOUT', 'USER', userId, null, {});
    return { success: true };
  }

  // ── NEW: ATH balance tracking ────────────────────────────
  async updateATH(userId: string) {
    await this.dataSource.query(
      `
      UPDATE users
      SET ath_balance = GREATEST(COALESCE(ath_balance, 0), total_balance)
      WHERE id = $1
    `,
      [userId],
    );
  }

  // ── NEW: Individual User ROI ─────────────────────────────
  async applyROIToUser(userId: string, date: string, adminId: string) {
    const user = await this.dataSource.query(
      `SELECT * FROM users WHERE id = $1 AND account_state = 'ACTIVE'`,
      [userId],
    );
    if (!user[0]) throw new Error('User not found or not ACTIVE');

    // Check duplicate
    const existing = await this.dataSource.query(
      `SELECT id FROM roi_logs WHERE user_id = $1 AND date = $2`,
      [userId, date],
    );
    if (existing.length > 0)
      throw new Error('ROI already applied for this date');

    const rate = await this.dataSource.query(
      `SELECT rate FROM roi_rates WHERE timeframe = $1 AND date = $2`,
      [user[0].timeframe, date],
    );
    if (!rate[0])
      throw new Error('No ROI rate set for this timeframe and date');

    const roiAmount =
      Number(user[0].active_deposit) * (Number(rate[0].rate) / 100);
    const newProfit = Number(user[0].total_profit) + roiAmount;
    const newBalance = Number(user[0].active_deposit) + newProfit;
    const cap = Number(user[0].principal) * 2;
    const finalProfit =
      newBalance > cap ? cap - Number(user[0].active_deposit) : newProfit;

    await this.dataSource.query(
      `
      UPDATE users SET total_profit = $1, total_balance = active_deposit + $1, updated_at = NOW()
      WHERE id = $2
    `,
      [finalProfit, userId],
    );

    await this.dataSource.query(
      `
      INSERT INTO roi_logs (user_id, amount, rate, timeframe, date, applied_by)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [userId, roiAmount, rate[0].rate, user[0].timeframe, date, adminId],
    );

    await this.log(adminId, 'APPLY_ROI_INDIVIDUAL', 'USER', userId, user[0], {
      roiAmount,
      date,
    });
    return { success: true, roi_applied: roiAmount };
  }

  // ── NEW: Breach reset fee payment ────────────────────────
  async processBreachReset(userId: string, adminId: string) {
    const user = await this.dataSource.query(
      `SELECT * FROM users WHERE id = $1 AND account_state = 'BREACHED'`,
      [userId],
    );
    if (!user[0]) throw new Error('User not found or not BREACHED');
    const resetFee = Number(user[0].ath_balance) * 0.01;
    await this.dataSource.query(
      `
      UPDATE users SET account_state = 'INACTIVE', updated_at = NOW() WHERE id = $1
    `,
      [userId],
    );
    await this.log(adminId, 'BREACH_RESET', 'USER', userId, user[0], {
      resetFee,
    });
    return { success: true, reset_fee: resetFee };
  }

  // ── NEW: Get all deposits (all states) ──────────────────
  async getAllDeposits(page = 1, limit = 50, status?: string) {
    const offset = (page - 1) * limit;
    const where = status ? `WHERE d.status = '${status}'` : '';
    return this.dataSource.query(
      `
      SELECT d.*, u.email, u.account_state
      FROM deposits d
      LEFT JOIN users u ON u.id = d.user_id
      ${where}
      ORDER BY d.created_at DESC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset],
    );
  }

  // ── NEW: Flag suspicious deposit ────────────────────────
  async flagDeposit(depositId: string, adminId: string, reason: string) {
    const before = await this.dataSource.query(
      `SELECT * FROM deposits WHERE id = $1`,
      [depositId],
    );
    await this.dataSource.query(
      `UPDATE deposits SET status = 'FLAGGED', flag_reason = $1 WHERE id = $2`,
      [reason, depositId],
    );
    await this.log(adminId, 'FLAG_DEPOSIT', 'DEPOSIT', depositId, before[0], {
      reason,
    });
    return { success: true };
  }

  // ── NEW: Get all withdrawals (all states) ───────────────
  async getAllWithdrawals(page = 1, limit = 50, status?: string) {
    const offset = (page - 1) * limit;
    const where = status ? `WHERE w.status = '${status}'` : '';
    return this.dataSource.query(
      `
      SELECT w.*, u.email, u.account_state, u.kyc_status
      FROM withdrawals w
      LEFT JOIN users u ON u.id = w.user_id
      ${where}
      ORDER BY w.created_at DESC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset],
    );
  }

  // ── NEW: Transaction Ledger ─────────────────────────────
  async getTransactionLedger(page = 1, limit = 50, filters?: any) {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [limit, offset];
    let paramIdx = 3;
    if (filters?.userId) {
      conditions.push(`user_id = $${paramIdx++}`);
      params.push(filters.userId);
    }
    if (filters?.type) {
      conditions.push(`entry_type = $${paramIdx++}`);
      params.push(filters.type);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return this.dataSource.query(
      `
      SELECT l.*, u.email FROM ledger_entries l
      LEFT JOIN users u ON u.id = l.user_id
      ${where}
      ORDER BY l.created_at DESC
      LIMIT $1 OFFSET $2
    `,
      params,
    );
  }

  // ── NEW: Referral governance ────────────────────────────
  async getReferralOverview(page = 1, limit = 50) {
    return this.dataSource.query(
      `
      SELECT r.*, u.email as referrer_email, u2.email as referred_email,
             u.account_state as referrer_state
      FROM referrals r
      LEFT JOIN users u ON u.id = r.referrer_id
      LEFT JOIN users u2 ON u2.id = r.referred_id
      ORDER BY r.created_at DESC
      LIMIT $1 OFFSET $2
    `,
      [limit, (page - 1) * limit],
    );
  }

  async disableReferralRewards(
    referralId: string,
    adminId: string,
    reason: string,
  ) {
    const before = await this.dataSource.query(
      `SELECT * FROM referrals WHERE id = $1`,
      [referralId],
    );
    await this.dataSource.query(
      `UPDATE referrals SET is_active = false WHERE id = $1`,
      [referralId],
    );
    await this.log(
      adminId,
      'DISABLE_REFERRAL',
      'REFERRAL',
      referralId,
      before[0],
      { reason },
    );
    return { success: true };
  }

  // ── NEW: Loyalty & Rank overview ────────────────────────
  async getLoyaltyOverview(page = 1, limit = 50) {
    return this.dataSource.query(
      `
      SELECT u.id, u.email, u.loyalty_score, u.rank, u.rank_level,
             u.account_state, u.completed_cycles, u.active_referrals,
             u.ath_balance, u.total_withdrawn
      FROM users u
      ORDER BY u.loyalty_score DESC
      LIMIT $1 OFFSET $2
    `,
      [limit, (page - 1) * limit],
    );
  }

  // ── NEW: Breached accounts ──────────────────────────────
  async getBreachedAccounts() {
    return this.dataSource.query(`
      SELECT u.*, 
             (u.ath_balance * 0.01) as reset_fee
      FROM users u
      WHERE u.account_state = 'BREACHED'
      ORDER BY u.updated_at DESC
    `);
  }

  // ── NEW: Enhanced overview with all states ──────────────
  async getFullOverview() {
    const stats = await this.dataSource.query(`
      SELECT
        COUNT(*) FILTER (WHERE account_state = 'ACTIVE') as active_users,
        COUNT(*) FILTER (WHERE account_state = 'GRACE') as grace_users,
        COUNT(*) FILTER (WHERE account_state = 'INACTIVE') as inactive_users,
        COUNT(*) FILTER (WHERE account_state = 'TERMINATED') as terminated_users,
        COUNT(*) FILTER (WHERE account_state = 'FROZEN') as frozen_users,
        COUNT(*) FILTER (WHERE account_state = 'BREACHED') as breached_users,
        COUNT(*) as total_users,
        COALESCE(SUM(active_deposit) FILTER (WHERE account_state = 'ACTIVE'), 0) as total_aum,
        COALESCE(SUM(total_profit), 0) as total_profit_on_platform,
        COALESCE(SUM(total_withdrawn), 0) as total_withdrawn,
        COALESCE(SUM(ath_balance), 0) as total_ath
      FROM users
    `);
    const pendingDeposits = await this.dataSource.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM deposits WHERE status = 'PENDING'`,
    );
    const pendingWithdrawals = await this.dataSource.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM withdrawals WHERE status = 'PENDING'`,
    );
    const pendingKYC = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM kyc_documents WHERE status = 'SUBMITTED'`,
    );
    const recentActivity = await this.dataSource.query(`
      SELECT 'DEPOSIT' as type, amount, status, created_at, user_id FROM deposits
      UNION ALL
      SELECT 'WITHDRAWAL' as type, amount, status, created_at, user_id FROM withdrawals
      ORDER BY created_at DESC LIMIT 20
    `);
    return {
      stats: stats[0],
      pending: {
        deposits: pendingDeposits[0],
        withdrawals: pendingWithdrawals[0],
        kyc: pendingKYC[0],
      },
      recent_activity: recentActivity,
    };
  }
}
