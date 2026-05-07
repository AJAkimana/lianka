import { Controller, Get, Req, UseGuards, Query } from '@nestjs/common';
import { RoiService } from '../modules/roi/roi.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';

@ApiTags('roi')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('roi')
export class RoiController {
  constructor(private roiService: RoiService) {}

  @Get('history')
  getHistory(@Req() req, @Query('limit') limit = 30) {
    return this.roiService.getROIHistory(req.user.id, +limit);
  }

  @Get('rates')
  getRates(@Query('date') date: string) {
    const today = date || new Date().toISOString().split('T')[0];
    return this.roiService.getRatesForDate(today);
  }
}
