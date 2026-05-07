import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RankHistory } from '../../entities/rank-history.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';

const RANKS = [
  {
    level: 6,
    name: 'Elite Contributor',
    condition: (u, refs) => false, // Requires admin validation — never auto-assigned
  },
  {
    level: 5,
    name: 'Strategic Partner',
    condition: (u, refs) =>
      Number(u.completed_cycles) >= 20 && refs.active >= 40,
  },
  {
    level: 4,
    name: 'Growth Partner',
    condition: (u, refs) =>
      Number(u.completed_cycles) >= 10 && refs.active >= 20,
  },
  {
    level: 3,
    name: 'Builder',
    condition: (u, refs) =>
      Number(u.completed_cycles) >= 5 && refs.active >= 10,
  },
  {
    level: 2,
    name: 'Contributor',
    condition: (u, refs) =>
      Number(u.completed_cycles) >= 3 || refs.active >= 5,
  },
  {
    level: 1,
    name: 'New Member',
    condition: () => true,
  },
];

@Injectable()
export class RankService {
  constructor(
    @InjectRepository(RankHistory)
    private historyRepo: Repository<RankHistory>,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
    private dataSource: DataSource,
  ) {}

  async evaluate(userId: string) {
    const user = await this.usersService.findById(userId);

    const refData = await this.dataSource.query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'ACTIVE') as active
       FROM referrals WHERE referrer_id = $1`,
      [userId],
    );
    const refs = {
      total: Number(refData[0]?.total || 0),
      active: Number(refData[0]?.active || 0),
    };

    // Find highest valid rank (ranks are sorted highest to lowest)
    const newRank = RANKS.find(r => r.condition(user, refs));
    if (!newRank) return; // Shouldn't happen — New Member always matches

    // Rank never decreases
    if (newRank.level <= user.rank_level) return;

    // Rank up!
    const oldRank = user.rank;
    user.rank = newRank.name;
    user.rank_level = newRank.level;
    await this.usersService.save(user);

    // Record in history
    await this.historyRepo.save({
      user_id: userId,
      rank: newRank.name,
      rank_level: newRank.level,
    });

    // Notify
    await this.notificationsService.create({
      user_id: userId,
      type: 'RANK_CHANGED',
      title: `Rank Achieved: ${newRank.name}`,
      message: `You have advanced from ${oldRank} to ${newRank.name}! New privileges are now unlocked.`,
      dot_color: 'purple',
      is_critical: false,
    });

    await this.emailService.sendRankUp(user.email, user.full_name, newRank.name);

    return { old_rank: oldRank, new_rank: newRank.name, level: newRank.level };
  }

  async evaluateAll() {
    const users = await this.dataSource.query(
      `SELECT id FROM users WHERE account_state NOT IN ('TERMINATED', 'FROZEN')`,
    );
    for (const u of users) {
      await this.evaluate(u.id);
    }
  }

  getRankPrivileges(rankLevel: number) {
    return {
      max_referrals: rankLevel >= 3 ? 'unlimited' : 5,
      promotion_eligible: rankLevel >= 3,
      biweekly_no_capital: rankLevel >= 4,
      daily_no_capital: rankLevel >= 5,
      lower_fees: rankLevel >= 3,
      priority_support: rankLevel >= 3,
    };
  }

  async getHistory(userId: string) {
    return this.historyRepo.find({
      where: { user_id: userId },
      order: { achieved_at: 'DESC' },
    });
  }
}
