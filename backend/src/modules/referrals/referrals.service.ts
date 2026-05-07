import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Referral } from '../../entities/referral.entity';
import { ReferralEarning } from '../../entities/referral-earning.entity';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';

const DEPOSIT_BONUS_RATE = 2.00;   // 2% of referred user deposit
const ROI_BONUS_RATE = 0.10;       // 0.1% of referred user daily profit

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(Referral)
    private referralRepo: Repository<Referral>,
    @InjectRepository(ReferralEarning)
    private earningRepo: Repository<ReferralEarning>,
    private ledgerService: LedgerService,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
  ) {}

  async createReferral(referrerId: string, referredId: string) {
    // Self-referral prevention
    if (referrerId === referredId) return null;

    const existing = await this.referralRepo.findOne({
      where: { referred_id: referredId },
    });
    if (existing) return existing;

    // Referral limit enforcement:
    // Max 5 referrals until Rank 3 (Builder), then unlimited
    const referrer = await this.dataSource.query(
      `SELECT rank_level FROM users WHERE id = $1`,
      [referrerId],
    );
    const rankLevel = Number(referrer[0]?.rank_level || 1);

    if (rankLevel < 3) {
      const count = await this.referralRepo.count({
        where: { referrer_id: referrerId },
      });
      if (count >= 5) {
        // Silently fail — do not expose limit to potential abusers
        return null;
      }
    }

    return this.referralRepo.save({
      referrer_id: referrerId,
      referred_id: referredId,
      status: 'PENDING',
    });
  }

  async activateReferral(referredUserId: string) {
    const referral = await this.referralRepo.findOne({
      where: { referred_id: referredUserId },
    });
    if (referral && referral.status === 'PENDING') {
      referral.status = 'ACTIVE';
      referral.activated_at = new Date();
      await this.referralRepo.save(referral);
    }
  }

  async creditDepositBonus(referredUserId: string, depositAmount: number) {
    const referral = await this.referralRepo.findOne({
      where: { referred_id: referredUserId },
    });
    if (!referral) return;

    const bonus = (depositAmount * DEPOSIT_BONUS_RATE) / 100;

    await this.ledgerService.credit(
      referral.referrer_id,
      'referral',
      bonus,
      'REFERRAL_BONUS',
      referral.id,
      `Deposit bonus — referred user deposited $${depositAmount}`,
    );

    await this.earningRepo.save({
      referral_id: referral.id,
      referrer_id: referral.referrer_id,
      referred_id: referredUserId,
      earning_type: 'DEPOSIT_BONUS',
      amount: bonus,
      source_amount: depositAmount,
      rate_applied: DEPOSIT_BONUS_RATE,
    });

    referral.total_deposit_bonus = Number(referral.total_deposit_bonus) + bonus;
    await this.referralRepo.save(referral);

    await this.notificationsService.create({
      user_id: referral.referrer_id,
      type: 'REFERRAL_DEPOSITED',
      title: 'Referral Bonus Earned',
      message: `You earned $${bonus.toFixed(2)} — your referral made a deposit.`,
      dot_color: 'green',
    });
  }

  async creditROIBonus(referredUserId: string, referredDailyProfit: number) {
    const referral = await this.referralRepo.findOne({
      where: { referred_id: referredUserId, status: 'ACTIVE' },
    });
    if (!referral) return;

    const bonus = (referredDailyProfit * ROI_BONUS_RATE) / 100;
    if (bonus <= 0) return;

    await this.ledgerService.credit(
      referral.referrer_id,
      'referral',
      bonus,
      'REFERRAL_BONUS',
      referral.id,
      `ROI bonus — $${referredDailyProfit.toFixed(2)} earned by referred user`,
    );

    await this.earningRepo.save({
      referral_id: referral.id,
      referrer_id: referral.referrer_id,
      referred_id: referredUserId,
      earning_type: 'ROI_BONUS',
      amount: bonus,
      source_amount: referredDailyProfit,
      rate_applied: ROI_BONUS_RATE,
    });

    referral.total_roi_bonus = Number(referral.total_roi_bonus) + bonus;
    await this.referralRepo.save(referral);
  }

  async getReferralDashboard(userId: string) {
    const referrals = await this.referralRepo.find({
      where: { referrer_id: userId },
      order: { created_at: 'DESC' },
    });

    const earnings = await this.earningRepo.find({
      where: { referrer_id: userId },
      order: { created_at: 'DESC' },
      take: 50,
    });

    const totalDepositBonus = earnings
      .filter(e => e.earning_type === 'DEPOSIT_BONUS')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const totalROIBonus = earnings
      .filter(e => e.earning_type === 'ROI_BONUS')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      total_referrals: referrals.length,
      active_referrals: referrals.filter(r => r.status === 'ACTIVE').length,
      total_earnings: totalDepositBonus + totalROIBonus,
      deposit_bonus_total: totalDepositBonus,
      roi_bonus_total: totalROIBonus,
      referrals,
      recent_earnings: earnings,
    };
  }
}
