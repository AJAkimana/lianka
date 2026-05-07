import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { RankService } from '../modules/rank/rank.service';
import { LoyaltyService } from '../modules/loyalty/loyalty.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';

@ApiTags('earn')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('earn')
export class EarnController {
  constructor(
    private rankService: RankService,
    private loyaltyService: LoyaltyService,
  ) {}

  @Get('rank')
  getRank(@Req() req) {
    return this.rankService.getHistory(req.user.id);
  }

  @Get('rank/privileges')
  getPrivileges(@Req() req) {
    return this.rankService.getRankPrivileges(req.user['rank_level'] || 1);
  }

  @Get('loyalty')
  getLoyalty(@Req() req) {
    return this.loyaltyService.getLatestScore(req.user.id);
  }
}
