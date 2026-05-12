import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KycDocument } from '../../entities/kyc-document.entity';
import { KycController } from '../../controllers/kyc.controller';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { KycService } from './kyc.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([KycDocument]),
    UsersModule,
    NotificationsModule,
    EmailModule,
  ],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
