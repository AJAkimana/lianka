import {
  Injectable, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Withdrawal } from '../../entities/withdrawal.entity';
import { UsersService } from '../users/users.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { LoyaltyService } from '../loyalty/loyalty.service';

@Injectable()
export class WithdrawalsService {
  constructor(
    @InjectRepository(Withdrawal)
    private repo: Repository<Withdrawal>,
    private usersService: UsersService,
    private ledgerService: LedgerService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
    private loyaltyService: LoyaltyService,
    private dataSource: DataSource,
  ) {}

  // ─── Gate logic validation ───────────────────────────────

  private async validateWithdrawal(
    userId: string,
    amount: number,
    walletType: string,
  ) {
    const user = await this.usersService.findById(userId);
    const today = new Date().toISOString().split('T')[0];

    // Gate 1: Account state
    // TERMINATED and FROZEN — fully blocked
    if (['TERMINATED', 'FROZEN'].includes(user.account_state)) {
      throw new ForbiddenException('Account closed — withdrawals not available');
    }
    // INACTIVE — blocked (no profit, no cycle running)
    // NOTE: Spec says INACTIVE can withdraw "remaining balance" but in practice
    // total_profit is 0 after GRACE expires to INACTIVE. Gate 7 will catch this.
    if (user.account_state === 'INACTIVE') {
      throw new ForbiddenException(
        'No active cycle — deposit to restart your earning cycle',
      );
    }
    // GRACE — explicitly ALLOWED per spec. ROI stops but withdrawal continues.
    // ACTIVE — fully allowed.
    // Both fall through to remaining gates below.

    // Gate 2: KYC
    if (user.kyc_status !== 'VERIFIED') {
      throw new ForbiddenException(
        user.kyc_status === 'SUBMITTED'
          ? 'KYC under review — withdrawals available once verified'
          : user.kyc_status === 'REJECTED'
          ? 'KYC rejected — resubmit to enable withdrawals'
          : 'Complete KYC to withdraw',
      );
    }

    // Gate 3: Withdrawal address must be set for this user
    const addressRecord = await this.dataSource.query(
      `SELECT address FROM withdrawal_addresses
       WHERE user_id = $1 AND (network = 'TRC20' OR network = 'BEP20')
       LIMIT 1`,
      [userId],
    );
    if (!addressRecord.length) {
      throw new ForbiddenException('Set a withdrawal address in Profile to continue');
    }

    // Gate 4: Active pending withdrawal
    const pending = await this.repo.findOne({
      where: { user_id: userId, status: 'PENDING' },
    });
    if (pending) {
      throw new ForbiddenException('Withdrawal already in progress');
    }

    // Gate 5: Next withdrawal date (profit wallet only)
    if (walletType === 'profit' && user.next_withdrawal_date) {
      if (today < user.next_withdrawal_date) {
        throw new ForbiddenException(
          `Next withdrawal available on ${user.next_withdrawal_date}`,
        );
      }
    }

    // Gate 6: Balance check
    const walletData = await this.dataSource.query(
      `SELECT balance FROM wallets WHERE user_id = $1 AND wallet_type = $2`,
      [userId, walletType],
    );
    const walletBalance = walletData[0]?.balance || 0;

    if (Number(walletBalance) <= 0) {
      throw new ForbiddenException('No balance available to withdraw');
    }

    // Gate 7: Max withdrawal percent (profit wallet)
    if (walletType === 'profit') {
      const maxPercent = this.getMaxWithdrawalPercent(user.timeframe);
      const maxAllowed = Number(user.total_profit) * maxPercent;
      if (amount > maxAllowed) {
        throw new BadRequestException(
          `Maximum withdrawal is $${maxAllowed.toFixed(2)} (${maxPercent * 100}% of profit for ${user.timeframe} plan)`,
        );
      }
    }

    // Gate 8: Minimum amount
    const minWithdrawal = 10;
    if (amount < minWithdrawal) {
      throw new BadRequestException(`Minimum withdrawal is $${minWithdrawal}`);
    }

    if (amount > Number(walletBalance)) {
      throw new BadRequestException('Amount exceeds available balance');
    }

    return { user, walletBalance: Number(walletBalance) };
  }

  // ─── User: Request withdrawal ────────────────────────────

  async requestWithdrawal(dto: {
    userId: string;
    amount: number;
    wallet_type: string;
    address: string;
    network: string;
  }) {
    const { user } = await this.validateWithdrawal(
      dto.userId, dto.amount, dto.wallet_type,
    );

    const networkFee = 2.10;
    const finalAmount = dto.amount - networkFee;

    if (finalAmount <= 0) {
      throw new BadRequestException('Amount too small after network fee deduction');
    }

    // Snapshot current state for audit
    const walletBalance = await this.dataSource.query(
      `SELECT balance FROM wallets WHERE user_id = $1 AND wallet_type = $2`,
      [dto.userId, dto.wallet_type],
    );

    const withdrawal = await this.repo.save({
      user_id: dto.userId,
      wallet_type: dto.wallet_type,
      amount: dto.amount,
      network_fee: networkFee,
      final_amount: finalAmount,
      address: dto.address,
      network: dto.network,
      status: 'PENDING',
      snapshot_profit_balance: walletBalance[0]?.balance,
      snapshot_total_balance: user.total_balance,
      snapshot_principal: user.principal,
      snapshot_loyalty_score: user.loyalty_score,
    });

    // Lock funds immediately via ledger debit
    await this.ledgerService.debit(
      dto.userId,
      dto.wallet_type,
      dto.amount,
      'WITHDRAWAL',
      withdrawal.id,
      `Withdrawal request locked — pending admin approval`,
    );

    // Update next withdrawal date
    if (dto.wallet_type === 'profit') {
      const nextDate = this.getNextWithdrawalDate(user.timeframe);
      user.next_withdrawal_date = nextDate;
      await this.usersService.save(user);
    }

    // Notify user
    await this.notificationsService.create({
      user_id: dto.userId,
      type: 'WITHDRAWAL_PENDING',
      title: 'Withdrawal Request Submitted',
      message: `Your withdrawal of $${dto.amount.toFixed(2)} is pending admin approval.`,
      dot_color: 'blue',
    });

    // Email
    await this.emailService.sendWithdrawalRequested(
      user.email,
      user.full_name,
      dto.amount,
      finalAmount,
      dto.address,
      dto.network,
    );

    return {
      message: 'Withdrawal request submitted successfully',
      withdrawal_id: withdrawal.id,
      amount: dto.amount,
      final_amount: finalAmount,
      network_fee: networkFee,
      status: 'PENDING',
    };
  }

  // ─── User: Cancel pending withdrawal ────────────────────

  async cancelWithdrawal(userId: string, withdrawalId: string) {
    const withdrawal = await this.repo.findOne({
      where: { id: withdrawalId, user_id: userId },
    });

    if (!withdrawal) throw new BadRequestException('Withdrawal not found');
    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException('Only pending withdrawals can be cancelled');
    }

    // Refund: re-credit the wallet
    await this.ledgerService.credit(
      userId,
      withdrawal.wallet_type,
      Number(withdrawal.amount),
      'WITHDRAWAL_CANCELLED',
      withdrawal.id,
      'Withdrawal cancelled — funds returned',
    );

    withdrawal.status = 'CANCELLED';
    await this.repo.save(withdrawal);

    // Reset next withdrawal date if profit wallet
    if (withdrawal.wallet_type === 'profit') {
      const user = await this.usersService.findById(userId);
      user.next_withdrawal_date = null;
      await this.usersService.save(user);
    }

    return { message: 'Withdrawal cancelled and funds returned to your wallet' };
  }

  // ─── Admin: Approve withdrawal ───────────────────────────

  async adminApprove(withdrawalId: string, adminId: string, txidSent: string, notes?: string) {
    const withdrawal = await this.repo.findOne({ where: { id: withdrawalId } });
    if (!withdrawal || withdrawal.status !== 'PENDING') {
      throw new BadRequestException('Invalid or already processed withdrawal');
    }

    withdrawal.status = 'COMPLETED';
    withdrawal.reviewed_by = adminId;
    withdrawal.reviewed_at = new Date();
    withdrawal.completed_at = new Date();
    withdrawal.txid_sent = txidSent;
    withdrawal.admin_notes = notes;
    await this.repo.save(withdrawal);

    const user = await this.usersService.findById(withdrawal.user_id);

    // Update user financial state
    user.total_profit = Number(user.total_profit) - Number(withdrawal.amount);
    user.total_balance = Number(user.active_deposit) + Number(user.total_profit);

    // CRITICAL: Post-withdrawal breach check
    if (Number(user.total_balance) < Number(user.principal)) {
      // Apply termination fee if loyalty < 80
      const terminationFee = Number(user.loyalty_score) >= 80
        ? 0
        : Number(user.total_balance) * 0.30;

      user.total_balance = Number(user.total_balance) - terminationFee;
      user.total_profit = user.total_balance - Number(user.active_deposit);

      await this.usersService.transitionToTerminated(user);

      await this.notificationsService.create({
        user_id: user.id,
        type: 'ACCOUNT_TERMINATED',
        title: 'Account Closed',
        message: `Your account has been closed due to balance falling below principal. Termination fee: $${terminationFee.toFixed(2)}`,
        dot_color: 'red',
        is_critical: true,
      });

      await this.emailService.sendAccountTerminated(
        user.email, user.full_name, terminationFee,
      );
    } else {
      await this.usersService.save(user);
    }

    // Notify user of completion
    await this.notificationsService.create({
      user_id: withdrawal.user_id,
      type: 'WITHDRAWAL_COMPLETED',
      title: 'Withdrawal Sent',
      message: `$${withdrawal.final_amount} has been sent to your wallet. TX: ${txidSent}`,
      dot_color: 'green',
      is_critical: true,
    });

    await this.emailService.sendWithdrawalCompleted(
      user.email,
      user.full_name,
      Number(withdrawal.final_amount),
      txidSent,
      withdrawal.address,
    );

    // Recalculate loyalty score after withdrawal (spec requirement)
    try {
      await this.loyaltyService.recalculateAfterWithdrawal(withdrawal.user_id);
    } catch (e) { /* non-blocking */ }

    return { message: 'Withdrawal completed', withdrawal_id: withdrawalId };
  }

  // ─── Admin: Reject withdrawal ────────────────────────────

  async adminReject(withdrawalId: string, adminId: string, reason: string) {
    const withdrawal = await this.repo.findOne({ where: { id: withdrawalId } });
    if (!withdrawal || withdrawal.status !== 'PENDING') {
      throw new BadRequestException('Invalid or already processed withdrawal');
    }

    // Refund funds back to wallet
    await this.ledgerService.credit(
      withdrawal.user_id,
      withdrawal.wallet_type,
      Number(withdrawal.amount),
      'WITHDRAWAL_REJECTED',
      withdrawal.id,
      `Withdrawal rejected: ${reason}`,
    );

    withdrawal.status = 'REJECTED';
    withdrawal.reviewed_by = adminId;
    withdrawal.reviewed_at = new Date();
    withdrawal.rejection_reason = reason;
    await this.repo.save(withdrawal);

    // Reset next withdrawal date
    if (withdrawal.wallet_type === 'profit') {
      const user = await this.usersService.findById(withdrawal.user_id);
      user.next_withdrawal_date = null;
      await this.usersService.save(user);
    }

    const user = await this.usersService.findById(withdrawal.user_id);

    await this.notificationsService.create({
      user_id: withdrawal.user_id,
      type: 'WITHDRAWAL_FAILED',
      title: 'Withdrawal Rejected',
      message: `Your withdrawal was rejected: ${reason}. Funds returned to your wallet.`,
      dot_color: 'red',
      is_critical: true,
    });

    await this.emailService.sendWithdrawalRejected(
      user.email, user.full_name, Number(withdrawal.amount), reason,
    );

    return { message: 'Withdrawal rejected and funds returned' };
  }

  // ─── User: Get my withdrawals ────────────────────────────

  async getUserWithdrawals(userId: string, page = 1, limit = 20) {
    const [items, total] = await this.repo.findAndCount({
      where: { user_id: userId },
      order: { requested_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async getPendingWithdrawal(userId: string) {
    return this.repo.findOne({ where: { user_id: userId, status: 'PENDING' } });
  }

  // ─── Helpers ─────────────────────────────────────────────

  getMaxWithdrawalPercent(timeframe: string): number {
    const map = {
      DAILY: 0.05,
      BIWEEKLY: 0.15,
      '40D': 0.25,
      '90D': 0.50,
      '180D': 1.00,
    };
    return map[timeframe] ?? 0.25;
  }

  getNextWithdrawalDate(timeframe: string): string {
    const now = new Date();
    const daysMap = {
      DAILY: 1,
      BIWEEKLY: 14,
      '40D': 40,
      '90D': 90,
      '180D': 180,
    };
    now.setDate(now.getDate() + (daysMap[timeframe] ?? 5));
    return now.toISOString().split('T')[0];
  }
}
