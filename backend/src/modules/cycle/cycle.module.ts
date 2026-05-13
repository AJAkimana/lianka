import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cycle } from '../../entities/cycle.entity';
import { CycleService } from './cycle.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cycle])],
  providers: [CycleService],
  exports: [CycleService],
})
export class CycleModule {}
