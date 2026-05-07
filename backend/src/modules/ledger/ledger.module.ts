import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerEntry } from '../../entities/ledger.entity';
import { LedgerService } from './ledger.service';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [TypeOrmModule.forFeature([LedgerEntry]), WalletsModule],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
