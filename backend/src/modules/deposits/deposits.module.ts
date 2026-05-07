import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deposit } from '../../entities/deposit.entity';
import { DepositsService } from './deposits.service';
import { DepositsController } from '../../controllers/deposits.controller';
import { UsersModule } from '../users/users.module';
import { LedgerModule } from '../ledger/ledger.module';
import { WalletsModule } from '../wallets/wallets.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { CycleModule } from '../cycle/cycle.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { RankModule } from '../rank/rank.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Deposit]),
    UsersModule,
    LedgerModule,
    WalletsModule,
    NotificationsModule,
    EmailModule,
    CycleModule,
    ReferralsModule,
    RankModule,
    LoyaltyModule,
  ],
  controllers: [DepositsController],
  providers: [DepositsService],
  exports: [DepositsService],
})
export class DepositsModule {}
