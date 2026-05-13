import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RoiRate } from '../../entities/roi-rate.entity';
import { RoiLog } from '../../entities/roi-log.entity';
import { UsersService } from '../users/users.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReferralsService } from '../referrals/referrals.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CycleService } from '../cycle/cycle.service';

const MAX_RATES = {
  DAILY: 0.2,
  BIWEEKLY: 0.5,
  '40D': 1.0,
  '90D': 1.2,
  '180D': 1.5,
};

@Injectable()
export class RoiService {
  constructor(
    @InjectRepository(RoiRate)
    private rateRepo: Repository<RoiRate>,
    @InjectRepository(RoiLog)
    private logRepo: Repository<RoiLog>,
    private usersService: UsersService,
    private ledgerService: LedgerService,
    private cycleService: CycleService,
    private notificationsService: NotificationsService,
    private referralsService: ReferralsService,
    private loyaltyService: LoyaltyService,
    private dataSource: DataSource,
  ) {}

  // ─── Admin: Set daily ROI rate ───────────────────────────

  async setRate(
    date: string,
    timeframe: string,
    rate: number,
    adminId: string,
  ) {
    const max = MAX_RATES[timeframe];
    if (!max) throw new BadRequestException('Invalid timeframe');
    if (rate > max) {
      throw new BadRequestException(
        `Rate ${rate}% exceeds max ${max}% for ${timeframe}`,
      );
    }
    if (rate <= 0) throw new BadRequestException('Rate must be positive');

    const existing = await this.rateRepo.findOne({
      where: { date, timeframe },
    });
    if (existing) {
      existing.rate = rate;
      return this.rateRepo.save(existing);
    }

    return this.rateRepo.save({ date, timeframe, rate, set_by: adminId });
  }

  async getRatesForDate(date: string) {
    return this.rateRepo.find({ where: { date } });
  }

  // ─── Core ROI engine — runs automatically at midnight UTC ─

  @Cron('0 0 * * 1-5') // Monday-Friday at midnight UTC
  async runDailyROIEngine() {
    const today = new Date().toISOString().split('T')[0];
    await this.applyROIForDate(today);
  }

  // Also callable manually by admin (with idempotency protection)
  async applyROIForDate(date: string, adminId?: string) {
    const isHoliday = await this.isWeekendOrHoliday(date);
    if (isHoliday) {
      return { message: 'Weekend or holiday — ROI not applied', date };
    }

    const users = await this.usersService.findAllActive();
    const results = { applied: 0, skipped: 0, errors: [], grace_triggered: [] };

    for (const user of users) {
      try {
        // Double-execution protection
        if (user.last_roi_date === date) {
          results.skipped++;
          continue;
        }

        // Get rate for user's timeframe
        const rateRecord = await this.rateRepo.findOne({
          where: { date, timeframe: user.timeframe },
        });

        if (!rateRecord) {
          results.skipped++;
          continue;
        }

        const rate = Number(rateRecord.rate);
        const activeDeposit = Number(user.active_deposit);
        const dailyProfit = (activeDeposit * rate) / 100;

        const prevProfit = Number(user.total_profit);
        const prevBalance = Number(user.total_balance);
        const max = Number(user.principal) * 2;

        let newProfit = prevProfit + dailyProfit;
        let newBalance = Number(user.active_deposit) + newProfit;
        let triggeredGrace = false;

        // 200% cap check
        if (newBalance >= max) {
          newBalance = max;
          newProfit = newBalance - Number(user.active_deposit);
          triggeredGrace = true;
        }

        // Update user
        user.total_profit = newProfit;
        user.total_balance = newBalance;
        user.trading_days_count = Number(user.trading_days_count) + 1;
        user.last_roi_date = date;

        // Credit profit wallet via ledger
        await this.ledgerService.credit(
          user.id,
          'profit',
          dailyProfit,
          'ROI',
          null,
          `Daily ROI ${rate}% on ${date}`,
        );

        // Log the ROI event
        await this.logRepo.save({
          user_id: user.id,
          date,
          timeframe: user.timeframe,
          rate_applied: rate,
          active_deposit: activeDeposit,
          profit_earned: dailyProfit,
          total_profit_after: newProfit,
          total_balance_after: newBalance,
          triggered_grace: triggeredGrace,
        });

        // Trigger GRACE if 200% hit
        if (triggeredGrace) {
          await this.usersService.transitionToGrace(user);
          await this.cycleService.markCycleGrace(user.id);
          await this.notificationsService.create({
            user_id: user.id,
            type: 'CYCLE_COMPLETED',
            title: 'Cycle Complete — 200% Reached!',
            message: `Your investment has reached 200%! Redeposit within 10 days to start a new cycle.`,
            dot_color: 'yellow',
            is_critical: true,
          });
          results.grace_triggered.push(user.id);
        } else {
          await this.usersService.save(user);

          // In-app notification
          await this.notificationsService.create({
            user_id: user.id,
            type: 'ROI_APPLIED',
            title: 'Daily Profit Added',
            message: `$${dailyProfit.toFixed(2)} ROI applied today. Balance: $${newBalance.toFixed(2)}`,
            dot_color: 'green',
          });
        }

        // Fire referral ROI bonus for referrer
        if (user.referred_by) {
          await this.referralsService.creditROIBonus(user.id, dailyProfit);
        }

        results.applied++;
      } catch (err) {
        results.errors.push({
          user_id: user.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Recalculate loyalty scores for all active users
    try {
      await this.loyaltyService.recalculateAll(date);
    } catch (err) {
      results.errors.push({
        context: 'loyalty_recalc',
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return { date, ...results };
  }

  // ─── GRACE period expiry — runs daily at 1am UTC ─────────

  @Cron('0 1 * * *')
  async checkGraceExpiry() {
    const now = new Date();
    const users = await this.usersService.findAllInGrace();

    for (const user of users) {
      if (user.grace_end_date && now > new Date(user.grace_end_date)) {
        await this.usersService.transitionToInactive(user);
        await this.cycleService.markCycleInactive(user.id);

        // Record missed redeposit in payment_events for loyalty tracking
        try {
          await this.dataSource.query(
            `INSERT INTO payment_events
             (user_id, event_type, cycle_number, grace_end_date)
             VALUES ($1, 'MISSED_REDEPOSIT', $2, $3)`,
            [user.id, user.completed_cycles, user.grace_end_date],
          );
        } catch {
          /* non-blocking — table may not exist on older deploys */
        }

        // Recalculate loyalty (spec: recalculate after grace expiry)
        try {
          await this.loyaltyService.recalculateAfterGraceExpiry(user.id);
        } catch {
          /* non-blocking */
        }

        await this.notificationsService.create({
          user_id: user.id,
          type: 'ACCOUNT_DEACTIVATED',
          title: 'Grace Period Expired',
          message:
            'Your grace period has ended. Deposit to restart your earning cycle.',
          dot_color: 'gray',
          is_critical: true,
        });
      }
    }
  }

  private async isWeekendOrHoliday(dateStr: string): Promise<boolean> {
    const date = new Date(dateStr + 'T12:00:00Z');
    const day = date.getUTCDay();
    // Saturday = 6, Sunday = 0
    if (day === 0 || day === 6) return true;

    // Check configured holidays in DB
    try {
      const holidays = await this.dataSource.query(
        `SELECT date FROM roi_holidays WHERE date = $1`,
        [dateStr],
      );
      if (holidays.length > 0) return true;
    } catch {
      // roi_holidays table may not exist on older deploys — non-blocking
    }
    return false;
  }

  private isWeekend(dateStr: string): boolean {
    const date = new Date(dateStr + 'T12:00:00Z');
    const day = date.getUTCDay();
    return day === 0 || day === 6;
  }

  async getROIHistory(userId: string, limit = 30) {
    return this.logRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }
}
