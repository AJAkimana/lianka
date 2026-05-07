import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Referral } from '../../entities/referral.entity';
import { ReferralEarning } from '../../entities/referral-earning.entity';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from '../../controllers/referrals.controller';
import { LedgerModule } from '../ledger/ledger.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Referral, ReferralEarning]),
    LedgerModule,
    NotificationsModule,
  ],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
