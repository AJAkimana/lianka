import { Controller, Post, Get, Body, Req, UseGuards, Query, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { DepositsService } from '../modules/deposits/deposits.service';
import { IsString, IsNumber, IsIn, Min } from 'class-validator';

class SubmitDepositDto {
  @IsNumber() @Min(100) amount: number;
  @IsString() @IsIn(['TRC20', 'BEP20']) network: string;
  @IsString() txid: string;
  @IsString() @IsIn(['DAILY','BIWEEKLY','40D','90D','180D']) plan: string;
}

@ApiTags('deposits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deposits')
export class DepositsController {
  constructor(private depositsService: DepositsService) {}

  @Get('info')
  getDepositInfo() {
    return this.depositsService.getDepositInfo();
  }

  @Post('submit')
  submit(@Body() dto: SubmitDepositDto, @Req() req) {
    return this.depositsService.submit({ ...dto, userId: req.user.id });
  }

  @Get('my')
  getMyDeposits(@Req() req, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.depositsService.getUserDeposits(req.user.id, +page, +limit);
  }
}
