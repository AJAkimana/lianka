import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../../entities/wallet.entity';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private repo: Repository<Wallet>,
  ) {}

  async createUserWallets(userId: string) {
    const types = ['profit', 'referral', 'promotion'];
    const wallets = types.map((t) =>
      this.repo.create({ user_id: userId, wallet_type: t, balance: 0 }),
    );
    return this.repo.save(wallets);
  }

  async findWallet(userId: string, walletType: string): Promise<Wallet> {
    const wallet = await this.repo.findOne({
      where: { user_id: userId, wallet_type: walletType },
    });
    if (!wallet) throw new NotFoundException(`${walletType} wallet not found`);
    return wallet;
  }

  async getAllWallets(userId: string) {
    return this.repo.find({ where: { user_id: userId } });
  }

  async setBalance(walletId: string, newBalance: number) {
    await this.repo.update(walletId, { balance: newBalance });
  }

  async getBalances(userId: string) {
    const wallets = await this.getAllWallets(userId);
    return wallets.reduce(
      (acc, w) => {
        acc[w.wallet_type] = Number(w.balance);
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
