import { Module } from '@nestjs/common';
import { ReinvestmentService } from './reinvestment.service';
import { ReinvestmentController } from './reinvestment.controller';
import { UsersModule } from '../users/users.module';
import { LedgerModule } from '../ledger/ledger.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [UsersModule, LedgerModule, NotificationsModule],
  controllers: [ReinvestmentController],
  providers: [ReinvestmentService],
  exports: [ReinvestmentService],
})
export class ReinvestmentModule {}
