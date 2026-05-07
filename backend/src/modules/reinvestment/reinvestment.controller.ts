import {
  Controller, Post, Get, Body, Req, UseGuards, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReinvestmentService } from './reinvestment.service';
import { IsNumber, Min } from 'class-validator';

class ReinvestDto {
  @IsNumber()
  @Min(1)
  amount: number;
}

@ApiTags('reinvestment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reinvestment')
export class ReinvestmentController {
  constructor(private reinvestmentService: ReinvestmentService) {}

  @Post('execute')
  reinvest(@Body() dto: ReinvestDto, @Req() req) {
    return this.reinvestmentService.reinvest(req.user.id, dto.amount);
  }

  @Get('preview')
  preview(@Query('amount') amount: string, @Req() req) {
    return this.reinvestmentService.getReinvestmentPreview(req.user.id, Number(amount));
  }
}
