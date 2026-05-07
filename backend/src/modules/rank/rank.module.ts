import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RankHistory } from '../../entities/rank-history.entity';
import { RankService } from './rank.service';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RankHistory]),
    UsersModule,
    NotificationsModule,
    EmailModule,
  ],
  providers: [RankService],
  exports: [RankService],
})
export class RankModule {}
