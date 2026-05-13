import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cycle } from '../../entities/cycle.entity';

@Injectable()
export class CycleService {
  constructor(
    @InjectRepository(Cycle)
    private repo: Repository<Cycle>,
  ) {}

  async startCycle(userId: string, depositAmount: number, plan: string) {
    // Close any active cycles first
    await this.repo.update(
      { user_id: userId, status: 'ACTIVE' },
      { status: 'COMPLETED', completed_at: new Date() },
    );

    // Count previous cycles for cycle_number
    const count = await this.repo.count({ where: { user_id: userId } });

    return this.repo.save({
      user_id: userId,
      cycle_number: count + 1,
      plan,
      deposit_amount: depositAmount,
      status: 'ACTIVE',
      started_at: new Date(),
    });
  }

  async markCycleGrace(userId: string) {
    const cycle = await this.repo.findOne({
      where: { user_id: userId, status: 'ACTIVE' },
    });
    if (cycle) {
      cycle.status = 'GRACE';
      cycle.grace_started_at = new Date();
      await this.repo.save(cycle);
    }
  }

  async markCycleInactive(userId: string) {
    await this.repo.update(
      { user_id: userId, status: 'GRACE' },
      { status: 'COMPLETED', completed_at: new Date() },
    );
  }

  async getCurrentCycle(userId: string) {
    return this.repo.findOne({
      where: { user_id: userId },
      order: { started_at: 'DESC' },
    });
  }

  async getCycleHistory(userId: string) {
    return this.repo.find({
      where: { user_id: userId },
      order: { started_at: 'DESC' },
    });
  }
}
