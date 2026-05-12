import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WithdrawalAddress } from '../../entities/withdrawal-address.entity';

@Injectable()
export class WithdrawalAddressService {
  constructor(
    @InjectRepository(WithdrawalAddress)
    private repo: Repository<WithdrawalAddress>,
  ) {}

  async getAddresses(userId: string) {
    return this.repo.find({ where: { user_id: userId } });
  }

  async updateAddress(userId: string, network: string, address: string) {
    const existing = await this.repo.findOne({
      where: { user_id: userId, network },
    });

    // Cooldown check
    if (
      existing?.next_update_allowed_at &&
      new Date() < new Date(existing.next_update_allowed_at)
    ) {
      const remaining = Math.ceil(
        (new Date(existing.next_update_allowed_at).getTime() - Date.now()) /
          (1000 * 60 * 60),
      );
      throw new BadRequestException(
        `Address can be updated in ${remaining} hours`,
      );
    }

    const nextAllowed = new Date();
    nextAllowed.setHours(nextAllowed.getHours() + 24);

    if (existing) {
      existing.address = address;
      existing.last_updated_at = new Date();
      existing.next_update_allowed_at = nextAllowed;
      return this.repo.save(existing);
    }

    return this.repo.save({
      user_id: userId,
      network,
      address,
      last_updated_at: new Date(),
      next_update_allowed_at: nextAllowed,
    });
  }
}
