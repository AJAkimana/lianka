import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntry } from '../../entities/ledger.entity';
import { WalletsService } from '../wallets/wallets.service';

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(LedgerEntry)
    private repo: Repository<LedgerEntry>,
    private walletsService: WalletsService,
  ) {}

  async credit(
    userId: string,
    walletType: string,
    amount: number,
    referenceType: string,
    referenceId: string | null,
    description?: string,
  ): Promise<LedgerEntry> {
    const wallet = await this.walletsService.findWallet(userId, walletType);
    const balanceBefore = Number(wallet.balance);
    const newBalance = balanceBefore + amount;

    await this.walletsService.setBalance(wallet.id, newBalance);

    return this.repo.save({
      user_id: userId,
      reference_type: referenceType,
      reference_id: referenceId,
      entry_type: 'CREDIT',
      wallet_type: walletType,
      amount,
      balance_before: balanceBefore,
      balance_after: newBalance,
      description,
    });
  }

  async debit(
    userId: string,
    walletType: string,
    amount: number,
    referenceType: string,
    referenceId: string | null,
    description?: string,
  ): Promise<LedgerEntry> {
    const wallet = await this.walletsService.findWallet(userId, walletType);
    const balanceBefore = Number(wallet.balance);

    if (balanceBefore < amount) {
      throw new BadRequestException(
        `Insufficient ${walletType} wallet balance. Available: $${balanceBefore.toFixed(2)}`,
      );
    }

    const newBalance = balanceBefore - amount;
    await this.walletsService.setBalance(wallet.id, newBalance);

    return this.repo.save({
      user_id: userId,
      reference_type: referenceType,
      reference_id: referenceId,
      entry_type: 'DEBIT',
      wallet_type: walletType,
      amount,
      balance_before: balanceBefore,
      balance_after: newBalance,
      description,
    });
  }

  async getUserLedger(userId: string, page = 1, limit = 50) {
    const [items, total] = await this.repo.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async getWalletLedger(userId: string, walletType: string, limit = 30) {
    return this.repo.find({
      where: { user_id: userId, wallet_type: walletType },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }
}
