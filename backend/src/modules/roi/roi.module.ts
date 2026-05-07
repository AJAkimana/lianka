import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoiRate } from '../../entities/roi-rate.entity';
import { RoiLog } from '../../entities/roi-log.entity';
import { RoiService } from './roi.service';
import { RoiController } from '../../controllers/roi.controller';
import { UsersModule } from '../users/users.module';
import { LedgerModule } from '../ledger/ledger.module';
import { CycleModule } from '../cycle/cycle.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoiRate, RoiLog]),
    UsersModule,
    LedgerModule,
    CycleModule,
    NotificationsModule,
    ReferralsModule,
    LoyaltyModule,
  ],
  controllers: [RoiController],
  providers: [RoiService],
  exports: [RoiService],
})
export class RoiModule {}
