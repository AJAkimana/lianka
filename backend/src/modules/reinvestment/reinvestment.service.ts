import {
  Injectable, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntry } from '../../entities/ledger.entity';
import { UsersService } from '../users/users.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReinvestmentService {
  constructor(
    private usersService: UsersService,
    private ledgerService: LedgerService,
    private notificationsService: NotificationsService,
  ) {}

  // ─── Reinvest from profit wallet into active_deposit ────────────────────────
  // Rules:
  // - Source is total_profit only. active_deposit is never touched as source.
  // - active_deposit += amount, total_profit -= amount, total_balance unchanged
  // - No frequency restriction — can reinvest any time profit > 0
  // - Does NOT reset next_withdrawal_date
  // - Allowed in ACTIVE and GRACE states only
  // - Principal is NOT changed by reinvestment — only deposits change principal

  async reinvest(userId: string, amount: number) {
    const user = await this.usersService.findById(userId);

    // Gate 1: State check — ACTIVE or GRACE only
    if (!['ACTIVE', 'GRACE'].includes(user.account_state)) {
      throw new ForbiddenException(
        user.account_state === 'TERMINATED'
          ? 'Account closed — reinvestment not available'
          : user.account_state === 'FROZEN'
          ? 'Account frozen — reinvestment not available'
          : 'No active cycle — deposit to enable reinvestment',
      );
    }

    // Gate 2: Amount must be positive
    if (!amount || amount <= 0) {
      throw new BadRequestException('Reinvestment amount must be greater than 0');
    }

    // Gate 3: Must have sufficient profit
    const currentProfit = Number(user.total_profit);
    if (currentProfit <= 0) {
      throw new ForbiddenException('No profit available to reinvest');
    }

    if (amount > currentProfit) {
      throw new BadRequestException(
        `Cannot reinvest more than available profit. Available: $${currentProfit.toFixed(2)}`,
      );
    }

    // Gate 4: Minimum reinvestment amount
    const MIN_REINVEST = 1;
    if (amount < MIN_REINVEST) {
      throw new BadRequestException(`Minimum reinvestment is $${MIN_REINVEST}`);
    }

    // Execute reinvestment:
    // - active_deposit increases (now earns more ROI)
    // - total_profit decreases by same amount
    // - total_balance stays exactly the same
    // - principal is NOT changed (only deposits change principal)
    const prevActiveDeposit = Number(user.active_deposit);
    const prevTotalProfit = Number(user.total_profit);
    const prevTotalBalance = Number(user.total_balance);

    user.active_deposit = prevActiveDeposit + amount;
    user.total_profit = prevTotalProfit - amount;
    // total_balance unchanged: active_deposit + total_profit = same total
    user.total_balance = user.active_deposit + user.total_profit;

    await this.usersService.save(user);

    // Ledger: debit profit wallet, credit a virtual "active_deposit" record
    await this.ledgerService.debit(
      userId,
      'profit',
      amount,
      'REINVESTMENT',
      null,
      `Reinvested $${amount.toFixed(2)} from profit into active deposit`,
    );

    // In-app notification
    await this.notificationsService.create({
      user_id: userId,
      type: 'REINVESTMENT',
      title: 'Profit Reinvested',
      message: `$${amount.toFixed(2)} moved from profit to active deposit. New active deposit: $${user.active_deposit.toFixed(2)}`,
      dot_color: 'green',
    });

    return {
      message: 'Reinvestment successful',
      amount_reinvested: amount,
      active_deposit_before: prevActiveDeposit,
      active_deposit_after: user.active_deposit,
      total_profit_after: user.total_profit,
      total_balance: user.total_balance,
      note: 'Principal unchanged. ROI will now be calculated on the higher active deposit.',
    };
  }

  async getReinvestmentPreview(userId: string, amount: number) {
    const user = await this.usersService.findById(userId);
    const maxRates: Record<string, number> = {
      DAILY: 0.20, BIWEEKLY: 0.50, '40D': 1.00, '90D': 1.20, '180D': 1.50,
    };
    const rate = maxRates[user.timeframe] || 0.20;
    const currentDailyROI = Number(user.active_deposit) * rate / 100;
    const newDailyROI = (Number(user.active_deposit) + amount) * rate / 100;

    return {
      amount,
      current_active_deposit: user.active_deposit,
      new_active_deposit: Number(user.active_deposit) + amount,
      current_daily_roi_estimate: currentDailyROI,
      new_daily_roi_estimate: newDailyROI,
      daily_roi_increase: newDailyROI - currentDailyROI,
      timeframe: user.timeframe,
      note: 'Based on current max rate. Actual rate set daily by admin.',
    };
  }
}
