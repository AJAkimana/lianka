import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Deposit } from '../../entities/deposit.entity';
import { UsersService } from '../users/users.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { ReferralsService } from '../referrals/referrals.service';
import { RankService } from '../rank/rank.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CycleService } from '../cycle/cycle.service';
import { WalletsService } from '../wallets/wallets.service';

const DEPOSIT_ADDRESSES = {
  TRC20:
    process.env.DEPOSIT_ADDRESS_TRC20 || 'TDFeZPisd4Rs31pkVCPGhz6QB6Y349jqHQ',
  BEP20:
    process.env.DEPOSIT_ADDRESS_BEP20 ||
    '0x1c9E87A2bE00A7bE0D76aEc122c2774DF996462D',
};

const MIN_DEPOSIT = 100;

@Injectable()
export class DepositsService {
  constructor(
    @InjectRepository(Deposit)
    private repo: Repository<Deposit>,
    private usersService: UsersService,
    private ledgerService: LedgerService,
    private walletsService: WalletsService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
    private cycleService: CycleService,
    private referralsService: ReferralsService,
    private rankService: RankService,
    private loyaltyService: LoyaltyService,
    private dataSource: DataSource,
  ) {}

  // ─── Get deposit addresses for user ─────────────────────

  getDepositInfo() {
    return {
      addresses: DEPOSIT_ADDRESSES,
      min_deposit: MIN_DEPOSIT,
      currency: 'USDT',
      instructions: [
        'Send ONLY USDT to the address matching your selected network',
        'Do NOT send any other token or coin',
        'Copy your Transaction ID (TXID) after sending',
        'Submit your TXID below to notify our team',
        'Deposits are manually verified within 24 hours',
      ],
    };
  }

  // ─── User: Submit deposit proof ──────────────────────────

  async submit(dto: {
    userId: string;
    amount: number;
    network: string;
    txid: string;
    plan: string;
  }) {
    // Per-plan minimum deposits (matches frontend and Screen 06 design)
    const PLAN_MINIMUMS: Record<string, number> = {
      DAILY: 5000,
      BIWEEKLY: 2000,
      '40D': 100,
      '90D': 100,
      '180D': 100,
    };
    const planMin = PLAN_MINIMUMS[dto.plan] ?? 100;
    if (dto.amount < planMin) {
      throw new BadRequestException(
        `Minimum deposit for ${dto.plan} plan is $${planMin.toLocaleString()} USDT`,
      );
    }

    // Validate network
    if (!['TRC20', 'BEP20'].includes(dto.network)) {
      throw new BadRequestException('Invalid network. Use TRC20 or BEP20');
    }

    // Validate plan
    const validPlans = ['DAILY', 'BIWEEKLY', '40D', '90D', '180D'];
    if (!validPlans.includes(dto.plan)) {
      throw new BadRequestException('Invalid investment plan');
    }

    // Duplicate TXID check — critical financial protection
    const duplicate = await this.repo.findOne({ where: { txid: dto.txid } });
    if (duplicate) {
      throw new ConflictException(
        'This transaction ID has already been submitted. Contact support if this is an error.',
      );
    }

    // Check for pending deposit from same user
    const pendingExists = await this.repo.findOne({
      where: { user_id: dto.userId, status: 'PENDING' },
    });
    if (pendingExists) {
      throw new BadRequestException(
        'You already have a pending deposit. Wait for it to be reviewed.',
      );
    }

    const deposit = await this.repo.save({
      user_id: dto.userId,
      amount: dto.amount,
      network: dto.network,
      txid: dto.txid.trim(),
      plan: dto.plan,
      status: 'PENDING',
    });

    const user = await this.usersService.findById(dto.userId);

    // Notify user
    await this.notificationsService.create({
      user_id: dto.userId,
      type: 'DEPOSIT_PENDING',
      title: 'Deposit Submitted',
      message: `Your deposit of $${dto.amount} USDT has been submitted and is pending review.`,
      dot_color: 'blue',
    });

    return {
      message:
        'Deposit submitted successfully. Our team will verify within 24 hours.',
      deposit_id: deposit.id,
      amount: dto.amount,
      network: dto.network,
      status: 'PENDING',
    };
  }

  // ─── Admin: Approve deposit ──────────────────────────────

  async approve(depositId: string, adminId: string, notes?: string) {
    const deposit = await this.repo.findOne({ where: { id: depositId } });
    if (!deposit) throw new BadRequestException('Deposit not found');
    if (deposit.status !== 'PENDING') {
      throw new BadRequestException('Deposit is not in pending state');
    }

    // Check for duplicate TXID already approved (extra safety)
    const alreadyApproved = await this.repo.findOne({
      where: { txid: deposit.txid, status: 'APPROVED' },
    });
    if (alreadyApproved && alreadyApproved.id !== depositId) {
      deposit.is_duplicate = true;
      deposit.status = 'REJECTED';
      deposit.rejection_reason =
        'Duplicate TXID — already approved on another submission';
      await this.repo.save(deposit);
      throw new BadRequestException(
        'Duplicate TXID detected — deposit rejected',
      );
    }

    // Mark approved
    deposit.status = 'APPROVED';
    deposit.reviewed_by = adminId;
    deposit.reviewed_at = new Date();
    deposit.admin_notes = notes;
    await this.repo.save(deposit);

    const user = await this.usersService.findById(deposit.user_id);
    const isFirstDeposit =
      user.account_state === 'INACTIVE' || user.account_state === 'GRACE';

    // Record on-time redeposit for loyalty tracking
    if (user.account_state === 'GRACE') {
      try {
        await this.dataSource.query(
          `INSERT INTO payment_events
           (user_id, event_type, cycle_number, deposit_id, grace_end_date, redeposit_date, days_before_end)
           VALUES ($1, 'ON_TIME_REDEPOSIT', $2, $3, $4, NOW(),
             EXTRACT(DAY FROM ($4::timestamptz - NOW()))::int)`,
          [
            deposit.user_id,
            user.completed_cycles,
            depositId,
            user.grace_end_date,
          ],
        );
      } catch {
        /* non-blocking — patch_001 may not be applied */
      }
    }

    if (isFirstDeposit || user.account_state === 'GRACE') {
      // Start or restart cycle
      (await this.usersService.resetCycle)
        ? await this.usersService.resetCycle(
            user,
            Number(deposit.amount),
            deposit.plan,
          )
        : await this.usersService.transitionToActive(
            user,
            Number(deposit.amount),
            deposit.plan,
          );
    } else if (user.account_state === 'ACTIVE') {
      // Top-up: add to active_deposit and principal
      user.principal = Number(user.principal) + Number(deposit.amount);
      user.active_deposit =
        Number(user.active_deposit) + Number(deposit.amount);
      user.total_balance =
        Number(user.active_deposit) + Number(user.total_profit);
      await this.usersService.save(user);
    }

    // Credit profit wallet via ledger
    await this.ledgerService.credit(
      deposit.user_id,
      'profit',
      Number(deposit.amount),
      'DEPOSIT',
      depositId,
      `Deposit approved — ${deposit.network} — TXID: ${deposit.txid}`,
    );

    // Record cycle
    await this.cycleService.startCycle(
      deposit.user_id,
      Number(deposit.amount),
      deposit.plan,
    );

    // Fire referral deposit bonus if user was referred
    if (user.referred_by) {
      await this.referralsService.creditDepositBonus(
        deposit.user_id,
        Number(deposit.amount),
      );
      // Update referral status to ACTIVE
      await this.referralsService.activateReferral(deposit.user_id);
    }

    // Recalculate loyalty and rank
    const today = new Date().toISOString().split('T')[0];
    await this.loyaltyService.recalculate(deposit.user_id, today);
    await this.rankService.evaluate(deposit.user_id);

    // Notify user
    await this.notificationsService.create({
      user_id: deposit.user_id,
      type: 'DEPOSIT_CONFIRMED',
      title: 'Deposit Confirmed ✓',
      message: `Your deposit of $${deposit.amount} USDT has been confirmed. Your cycle is now active!`,
      dot_color: 'green',
      is_critical: true,
    });

    await this.emailService.sendDepositConfirmed(
      user.email,
      user.full_name,
      Number(deposit.amount),
      deposit.network,
      deposit.txid,
    );

    return {
      message: 'Deposit approved and credited',
      deposit_id: depositId,
      amount: deposit.amount,
    };
  }

  // ─── Admin: Reject deposit ───────────────────────────────

  async reject(depositId: string, adminId: string, reason: string) {
    const deposit = await this.repo.findOne({ where: { id: depositId } });
    if (!deposit || deposit.status !== 'PENDING') {
      throw new BadRequestException('Invalid or already processed deposit');
    }

    deposit.status = 'REJECTED';
    deposit.reviewed_by = adminId;
    deposit.reviewed_at = new Date();
    deposit.rejection_reason = reason;
    await this.repo.save(deposit);

    const user = await this.usersService.findById(deposit.user_id);

    await this.notificationsService.create({
      user_id: deposit.user_id,
      type: 'DEPOSIT_REJECTED',
      title: 'Deposit Rejected',
      message: `Your deposit of $${deposit.amount} was rejected: ${reason}`,
      dot_color: 'red',
      is_critical: true,
    });

    await this.emailService.sendDepositRejected(
      user.email,
      user.full_name,
      Number(deposit.amount),
      reason,
    );

    return { message: 'Deposit rejected' };
  }

  // ─── Queries ─────────────────────────────────────────────

  findPending() {
    return this.repo.find({
      where: { status: 'PENDING' },
      order: { submitted_at: 'ASC' },
    });
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async getUserDeposits(userId: string, page = 1, limit = 20) {
    const [items, total] = await this.repo.findAndCount({
      where: { user_id: userId },
      order: { submitted_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }
}
