import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminUser } from '../../entities/admin-user.entity';
import { AdminLog } from '../../entities/admin-log.entity';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { AdminController } from '../../controllers/admin.controller';
import { DepositsModule } from '../deposits/deposits.module';
import { WithdrawalsModule } from '../withdrawals/withdrawals.module';
import { KycModule } from '../kyc/kyc.module';
import { RoiModule } from '../roi/roi.module';
import { UsersModule } from '../users/users.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { RankModule } from '../rank/rank.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUser, AdminLog]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '8h' },
      }),
      inject: [ConfigService],
    }),
    DepositsModule,
    WithdrawalsModule,
    KycModule,
    RoiModule,
    UsersModule,
    LoyaltyModule,
    RankModule,
    NotificationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
  exports: [AdminService, AdminGuard],
})
export class AdminModule {}
