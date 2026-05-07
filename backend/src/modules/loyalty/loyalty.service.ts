import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { LoyaltySnapshot } from '../../entities/loyalty.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(LoyaltySnapshot)
    private repo: Repository<LoyaltySnapshot>,
    private usersService: UsersService,
    private dataSource: DataSource,
  ) {}

  // ─── Recalculate all users (called after ROI engine) ─────

  async recalculateAll(date: string) {
    const users = await this.dataSource.query(
      `SELECT * FROM users WHERE account_state NOT IN ('TERMINATED')`,
    );
    for (const user of users) {
      await this.recalculate(user.id, date);
    }
  }

  // ─── Recalculate single user ─────────────────────────────

  async recalculate(userId: string, date?: string) {
    const today = date || new Date().toISOString().split('T')[0];
    const user = await this.usersService.findById(userId);

    // Component 1: Completed Cycles (weight 35%)
    const targetCycles = 10;
    const completedCyclesScore = Math.min(
      (Number(user.completed_cycles) / targetCycles), 1,
    ) * 35;

    // Component 2: Redeposit Behavior (weight 20%)
    // Spec: successful_redeposits / completed_cycles
    // Uses payment_events table to count actual on-time redeposits after cycle completions
    let redepositScore = 0;
    if (Number(user.completed_cycles) > 0) {
      const redeposits = await this.dataSource.query(
        `SELECT COUNT(*) as count FROM payment_events
         WHERE user_id = $1 AND event_type = 'ON_TIME_REDEPOSIT'`,
        [userId],
      );
      const onTimeCount = Number(redeposits[0]?.count || 0);
      redepositScore = Math.min(
        onTimeCount / Number(user.completed_cycles),
        1,
      ) * 20;
    }

    // Component 3: No Principal Breach (weight 20%)
    const breachCount = Number(user.breach_count);
    const noBreach = Math.max(20 - breachCount * 10, 0);

    // Component 4: Timeframe Discipline (weight 10%)
    // Spec: average weight of chosen timeframes across ALL completed cycles
    // Use cycle history to get actual timeframes used, not just current
    const cycleHistory = await this.dataSource.query(
      `SELECT plan FROM cycles WHERE user_id = $1 AND status IN ('COMPLETED','ACTIVE','GRACE')`,
      [userId],
    );
    const timeframeWeights: Record<string, number> = {
      '180D': 1.0, '90D': 0.8, '40D': 0.6, 'BIWEEKLY': 0.3, 'DAILY': 0.1,
    };
    let avgWeight = timeframeWeights[user.timeframe] || 0.1; // default to current
    if (cycleHistory.length > 0) {
      const totalWeight = cycleHistory.reduce(
        (sum: number, c: any) => sum + (timeframeWeights[c.plan] || 0.1),
        0,
      );
      avgWeight = totalWeight / cycleHistory.length;
    }
    const timeframeScore = avgWeight * 10;

    // Component 5: Account Age (weight 5%)
    const accountDays = Math.floor(
      (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    const accountAgeScore = Math.min(accountDays / 180, 1) * 5;

    // Component 6: Referral Quality (weight 5%)
    const refData = await this.dataSource.query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'ACTIVE') as active
       FROM referrals WHERE referrer_id = $1`,
      [userId],
    );
    const totalRefs = Number(refData[0]?.total || 0);
    const activeRefs = Number(refData[0]?.active || 0);
    const referralQualityScore = totalRefs > 0
      ? (activeRefs / totalRefs) * 5
      : 0;

    // Component 7: Promotion Contribution (weight 5%)
    // Admin-assigned — fetch latest value from loyalty_snapshots or default 0
    const lastSnapshot = await this.repo.findOne({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
    const promotionScore = lastSnapshot?.promotion_score || 0;

    // Calculate total weighted score
    const total = Math.min(
      completedCyclesScore +
      redepositScore +
      noBreach +
      timeframeScore +
      accountAgeScore +
      referralQualityScore +
      Number(promotionScore),
      100,
    );

    // Save snapshot (upsert by user+date)
    const existing = await this.repo.findOne({ where: { user_id: userId, date: today } });
    const snapshot = existing || this.repo.create({ user_id: userId, date: today });

    snapshot.completed_cycles_score = completedCyclesScore;
    snapshot.redeposit_score = redepositScore;
    snapshot.no_breach_score = noBreach;
    snapshot.timeframe_score = timeframeScore;
    snapshot.account_age_score = accountAgeScore;
    snapshot.referral_quality_score = referralQualityScore;
    snapshot.promotion_score = Number(promotionScore);
    snapshot.total_score = Number(total.toFixed(2));

    await this.repo.save(snapshot);

    // Update user loyalty_score
    user.loyalty_score = Number(total.toFixed(2));
    await this.usersService.save(user);

    return snapshot;
  }

  async getLatestScore(userId: string) {
    return this.repo.findOne({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  // Admin: set promotion contribution score (0-5)
  async setPromotionScore(userId: string, score: number, adminId: string) {
    if (score < 0 || score > 5) throw new Error('Score must be 0–5');
    const today = new Date().toISOString().split('T')[0];
    const snapshot = await this.repo.findOne({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
    if (snapshot) {
      snapshot.promotion_score = score;
      await this.repo.save(snapshot);
    }
    // Trigger full recalc
    return this.recalculate(userId, today);
  }

  // Called after withdrawal completes (spec: recalculate after withdrawal)
  async recalculateAfterWithdrawal(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    return this.recalculate(userId, today);
  }

  // Called when grace period expires (spec: recalculate after grace expiry)
  async recalculateAfterGraceExpiry(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    return this.recalculate(userId, today);
  }
}
