import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  Query,
  Param,
  Delete,
} from '@nestjs/common';
import { WithdrawalsService } from '../modules/withdrawals/withdrawals.service';
import { IsString, IsNumber, IsIn, Min } from 'class-validator';
import { IsOptional } from 'class-validator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';

class RequestWithdrawalDto {
  @IsNumber() @Min(10) amount: number;
  @IsString() @IsIn(['profit', 'referral', 'promotion']) wallet_type: string;
  @IsString() address: string;
  @IsString() @IsIn(['TRC20', 'BEP20']) network: string;
}

@ApiTags('withdrawals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private withdrawalsService: WithdrawalsService) {}

  @Post('request')
  request(@Body() dto: RequestWithdrawalDto, @Req() req) {
    return this.withdrawalsService.requestWithdrawal({
      ...dto,
      userId: req.user.id,
    });
  }

  @Delete('cancel/:id')
  cancel(@Param('id') id: string, @Req() req) {
    return this.withdrawalsService.cancelWithdrawal(req.user.id, id);
  }

  @Get('my')
  getMyWithdrawals(
    @Req() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.withdrawalsService.getUserWithdrawals(
      req.user.id,
      +page,
      +limit,
    );
  }

  @Get('pending')
  getPending(@Req() req) {
    return this.withdrawalsService.getPendingWithdrawal(req.user.id);
  }
}
