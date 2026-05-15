import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/users.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    // Generate unique referral code
    const referral_code = await this.generateUniqueReferralCode();
    const user = this.repo.create({ ...data, referral_code });
    return this.repo.save(user);
  }

  async findById(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email: email.toLowerCase() } });
  }

  async findByReferralCode(code: string): Promise<User | null> {
    return this.repo.findOne({ where: { referral_code: code } });
  }

  async findByEmailVerifyToken(tokenOrCode: string): Promise<User | null> {
    return this.repo.findOne({
      where: [
        { email_verify_token: tokenOrCode },
        { email_verify_code: tokenOrCode },
      ],
    });
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    return this.repo.findOne({ where: { password_reset_token: token } });
  }

  async findAllActive(): Promise<User[]> {
    return this.repo.find({ where: { account_state: 'ACTIVE' } });
  }

  async findAllInGrace(): Promise<User[]> {
    return this.repo.find({ where: { account_state: 'GRACE' } });
  }

  async save(user: User): Promise<User> {
    return this.repo.save(user);
  }

  async updateLastLogin(userId: string, ip: string): Promise<void> {
    await this.repo.update(userId, {
      last_login_at: new Date(),
      last_login_ip: ip,
    });
  }

  async getDashboardData(userId: string) {
    const result = await this.repo.query(
      `SELECT * FROM user_dashboard WHERE id = $1`,
      [userId],
    );
    return result[0] || null;
  }

  private async generateUniqueReferralCode(): Promise<string> {
    let code: string;
    let exists = true;
    while (exists) {
      code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const user = await this.repo.findOne({ where: { referral_code: code } });
      exists = !!user;
    }
    return code;
  }

  // ─── State transitions ───────────────────────────────────

  async transitionToActive(
    user: User,
    depositAmount: number,
    timeframe: string,
  ): Promise<User> {
    user.account_state = 'ACTIVE';
    user.principal = Number(depositAmount);
    user.active_deposit = Number(depositAmount);
    user.total_profit = 0;
    user.total_balance = Number(depositAmount);
    user.timeframe = timeframe;
    user.cycle_start_date = new Date();
    user.grace_end_date = null;
    user.trading_days_count = 0;
    return this.repo.save(user);
  }

  async transitionToGrace(user: User): Promise<User> {
    const graceEnd = new Date();
    graceEnd.setDate(graceEnd.getDate() + 10);
    user.account_state = 'GRACE';
    user.grace_end_date = graceEnd;
    // Cap balance at 200%
    user.total_balance = Number(user.principal) * 2;
    user.total_profit = user.total_balance - Number(user.active_deposit);
    return this.repo.save(user);
  }

  async transitionToInactive(user: User): Promise<User> {
    user.account_state = 'INACTIVE';
    user.grace_end_date = null;
    return this.repo.save(user);
  }

  async transitionToTerminated(user: User): Promise<User> {
    user.account_state = 'TERMINATED';
    user.breach_count = Number(user.breach_count) + 1;
    user.completed_cycles = Number(user.completed_cycles); // does not increment on termination
    return this.repo.save(user);
  }

  async resetCycle(
    user: User,
    newDeposit: number,
    timeframe: string,
  ): Promise<User> {
    user.completed_cycles = Number(user.completed_cycles) + 1;
    user.principal = Number(newDeposit);
    user.active_deposit = Number(newDeposit);
    user.total_profit = 0;
    user.total_balance = Number(newDeposit);
    user.timeframe = timeframe;
    user.cycle_start_date = new Date();
    user.grace_end_date = null;
    user.trading_days_count = 0;
    user.last_roi_date = null;
    user.account_state = 'ACTIVE';
    return this.repo.save(user);
  }
}
