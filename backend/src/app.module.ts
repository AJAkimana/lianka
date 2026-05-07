import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { DepositsModule } from './modules/deposits/deposits.module';
import { WithdrawalsModule } from './modules/withdrawals/withdrawals.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { RoiModule } from './modules/roi/roi.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { KycModule } from './modules/kyc/kyc.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { RankModule } from './modules/rank/rank.module';
import { AdminModule } from './modules/admin/admin.module';
import { EmailModule } from './modules/email/email.module';
import { CycleModule } from './modules/cycle/cycle.module';
import { ReinvestmentModule } from './modules/reinvestment/reinvestment.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({ isGlobal: true }),

    // Cron jobs
    ScheduleModule.forRoot(),

    // Rate limiting
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 5 },
      { name: 'medium', ttl: 10000, limit: 20 },
      { name: 'long', ttl: 60000, limit: 100 },
    ]),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASS'),
        database: config.get('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false, // NEVER true in production — schema.sql handles this
        ssl: config.get('NODE_ENV') === 'production'
          ? { rejectUnauthorized: false }
          : false,
        logging: config.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    EmailModule,
    UsersModule,
    WalletsModule,
    LedgerModule,
    AuthModule,
    DepositsModule,
    WithdrawalsModule,
    RoiModule,
    CycleModule,
    ReferralsModule,
    KycModule,
    NotificationsModule,
    LoyaltyModule,
    RankModule,
    AdminModule,
    ReinvestmentModule,
  ],
})
export class AppModule {}
