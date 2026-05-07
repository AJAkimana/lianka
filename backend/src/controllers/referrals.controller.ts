import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ReferralsService } from '../modules/referrals/referrals.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';

@ApiTags('referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('referrals')
export class ReferralsController {
  constructor(private referralsService: ReferralsService) {}

  @Get('dashboard')
  getDashboard(@Req() req) {
    return this.referralsService.getReferralDashboard(req.user.id);
  }
}
