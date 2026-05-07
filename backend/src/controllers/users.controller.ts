import {
  Controller,
  Get,
  Put,
  Body,
  Req,
  UseGuards,
  Post,
  Param,
  Query,
} from '@nestjs/common';
import { UsersService } from '../modules/users/users.service';
import { LedgerService } from '../modules/ledger/ledger.service';
import { IsString, IsIn, IsOptional as Opt } from 'class-validator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';

class UpdateAddressDto {
  @IsString() address: string;
  @IsString() @IsIn(['TRC20', 'BEP20']) network: string;
  @IsString() verification_code: string;
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private ledgerService: LedgerService,
  ) {}

  @Get('me')
  getMe(@Req() req) {
    return this.usersService.getDashboardData(req.user.id);
  }

  @Get('me/ledger')
  getLedger(@Req() req, @Query('page') page = 1) {
    return this.ledgerService.getUserLedger(req.user.id, +page);
  }

  @Get('me/transactions')
  getTransactions(
    @Req() req,
    @Query('page') page = 1,
    @Query('type') type?: string,
  ) {
    return this.ledgerService.getUserLedger(req.user.id, +page);
  }
}
