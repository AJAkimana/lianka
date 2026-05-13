import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Patch,
} from '@nestjs/common';
import { AdminGuard } from '../modules/admin/admin.guard';
import { AdminService } from '../modules/admin/admin.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { ApiTags } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';

class AdminLoginDto {
  @IsString() email: string;
  @IsString() password: string;
}

class ApproveDepositDto {
  @IsOptional() @IsString() notes?: string;
}

class RejectDto {
  @IsString() reason: string;
}

class ApproveWithdrawalDto {
  @IsString() txid_sent: string;
  @IsOptional() @IsString() notes?: string;
}

class SetROIDto {
  @IsString() date: string;
  @IsString() timeframe: string;
  @IsNumber() rate: number;
}

class RunROIDto {
  @IsString() date: string;
}

class IssuePromotionDto {
  @IsString() user_id: string;
  @IsNumber() amount: number;
  @IsString() title: string;
}

class CreateAdminDto {
  @IsString() email: string;
  @IsString() password: string;
  @IsString() full_name: string;
  @IsString()
  @IsIn(['SUPER_ADMIN', 'FINANCE_ADMIN', 'KYC_ADMIN', 'SUPPORT_ADMIN'])
  role: string;
}

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  // ─── Admin init (first run only) ─────────────────────────
  @Post('init')
  init(@Body() body: { email: string; password: string; full_name: string }) {
    return this.adminService.createInitialAdmin(
      body.email,
      body.password,
      body.full_name,
    );
  }

  // ─── Admin login ─────────────────────────────────────────
  @Post('login')
  async login(@Body() dto: AdminLoginDto, @Req() req) {
    const admin = await this.adminService.validateAdmin(
      dto.email,
      dto.password,
    );
    if (!admin) throw new Error('Invalid credentials');
    const token = this.jwtService.sign(
      { sub: admin.id, email: admin.email, role: admin.role, is_admin: true },
      { secret: this.config.get('JWT_SECRET'), expiresIn: '8h' },
    );
    return {
      access_token: token,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        full_name: admin.full_name,
      },
    };
  }

  // ─── Overview ────────────────────────────────────────────
  @UseGuards(AdminGuard)
  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  // ─── Users ───────────────────────────────────────────────
  @UseGuards(AdminGuard)
  @Get('users')
  getUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query() filters: any,
  ) {
    return this.adminService.getUsers(+page, +limit, filters);
  }

  @UseGuards(AdminGuard)
  @Get('users/:id')
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @UseGuards(AdminGuard)
  @Post('users/:id/freeze')
  freeze(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req,
  ) {
    return this.adminService.freezeUser(
      id,
      req.user?.id || 'admin',
      body.reason,
    );
  }

  @UseGuards(AdminGuard)
  @Post('users/:id/unfreeze')
  unfreeze(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req,
  ) {
    return this.adminService.unfreezeUser(
      id,
      req.user?.id || 'admin',
      body.reason,
    );
  }

  @UseGuards(AdminGuard)
  @Post('users/:id/reset-cycle')
  resetCycle(
    @Param('id') id: string,
    @Body() body: { notes: string },
    @Req() req,
  ) {
    return this.adminService.resetCycle(
      id,
      req.user?.id || 'admin',
      body.notes,
    );
  }

  // ─── Deposits ────────────────────────────────────────────
  @UseGuards(AdminGuard)
  @Get('deposits/pending')
  getPendingDeposits() {
    return this.adminService.getPendingDeposits();
  }

  @UseGuards(AdminGuard)
  @Post('deposits/:id/approve')
  approveDeposit(
    @Param('id') id: string,
    @Body() dto: ApproveDepositDto,
    @Req() req,
  ) {
    return this.adminService.approveDeposit(
      id,
      req.user?.id || 'admin',
      dto.notes,
    );
  }

  @UseGuards(AdminGuard)
  @Post('deposits/:id/reject')
  rejectDeposit(@Param('id') id: string, @Body() dto: RejectDto, @Req() req) {
    return this.adminService.rejectDeposit(
      id,
      req.user?.id || 'admin',
      dto.reason,
    );
  }

  // ─── Withdrawals ─────────────────────────────────────────
  @UseGuards(AdminGuard)
  @Get('withdrawals/pending')
  getPendingWithdrawals() {
    return this.adminService.getPendingWithdrawals();
  }

  @Post('withdrawals/:id/approve')
  approveWithdrawal(
    @Param('id') id: string,
    @Body() dto: ApproveWithdrawalDto,
    @Req() req,
  ) {
    return this.adminService.approveWithdrawal(
      id,
      req.user?.id || 'admin',
      dto.txid_sent,
      dto.notes,
    );
  }

  @UseGuards(AdminGuard)
  @Post('withdrawals/:id/reject')
  rejectWithdrawal(
    @Param('id') id: string,
    @Body() dto: RejectDto,
    @Req() req,
  ) {
    return this.adminService.rejectWithdrawal(
      id,
      req.user?.id || 'admin',
      dto.reason,
    );
  }

  // ─── KYC ─────────────────────────────────────────────────
  @UseGuards(AdminGuard)
  @Get('kyc/pending')
  getPendingKYC() {
    return this.adminService.getPendingKYC();
  }

  @UseGuards(AdminGuard)
  @Post('kyc/:id/approve')
  approveKYC(@Param('id') id: string, @Req() req) {
    return this.adminService.approveKYC(id, req.user?.id || 'admin');
  }

  @UseGuards(AdminGuard)
  @Post('kyc/:id/reject')
  rejectKYC(@Param('id') id: string, @Body() dto: RejectDto, @Req() req) {
    return this.adminService.rejectKYC(id, req.user?.id || 'admin', dto.reason);
  }

  // ─── ROI ─────────────────────────────────────────────────
  @UseGuards(AdminGuard)
  @Post('roi/set-rate')
  setROI(@Body() dto: SetROIDto, @Req() req) {
    return this.adminService.setROIRate(
      dto.date,
      dto.timeframe,
      dto.rate,
      req.user?.id || 'admin',
    );
  }

  @UseGuards(AdminGuard)
  @Post('roi/run')
  runROI(@Body() dto: RunROIDto, @Req() req) {
    return this.adminService.runROIEngine(dto.date, req.user?.id || 'admin');
  }

  // ─── Promotions ──────────────────────────────────────────
  @Post('promotions/issue')
  issuePromotion(@Body() dto: IssuePromotionDto, @Req() req) {
    return this.adminService.issuePromotion(
      dto.user_id,
      dto.amount,
      dto.title,
      req.user?.id || 'admin',
    );
  }

  // ─── Admin users ─────────────────────────────────────────
  @Post('admins/create')
  createAdmin(@Body() dto: CreateAdminDto, @Req() req) {
    return this.adminService.createAdmin(dto, req.user?.id || 'admin');
  }

  // ─── Audit log ───────────────────────────────────────────
  @Get('audit-log')
  getAuditLog(@Query('page') page = 1) {
    return this.adminService.getAuditLog(+page);
  }

  // ─── Emergency ───────────────────────────────────────────
  @Post('emergency/pause/:type')
  pause(@Param('type') type: any, @Req() req) {
    return this.adminService.emergencyPause(type, req.user?.id || 'admin');
  }

  @Post('emergency/resume/:type')
  resume(@Param('type') type: any, @Req() req) {
    return this.adminService.emergencyResume(type, req.user?.id || 'admin');
  }

  // ─── Health check ────────────────────────────────────────
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  // ── NEW ENDPOINTS ────────────────────────────────────────

  @UseGuards(AdminGuard)
  @Get('overview/full')
  getFullOverview() {
    return this.adminService.getFullOverview();
  }

  @UseGuards(AdminGuard)
  @Post('users/:id/flag')
  flagUser(
    @Param('id') id: string,
    @Body() dto: { reason: string },
    @Req() req,
  ) {
    return this.adminService.flagUser(id, req.admin.sub, dto.reason);
  }

  @UseGuards(AdminGuard)
  @Post('users/:id/force-logout')
  forceLogout(@Param('id') id: string, @Req() req) {
    return this.adminService.forceLogout(id, req.admin.sub);
  }

  @UseGuards(AdminGuard)
  @Post('users/:id/roi')
  applyROIToUser(
    @Param('id') id: string,
    @Body() dto: { date: string },
    @Req() req,
  ) {
    return this.adminService.applyROIToUser(id, dto.date, req.admin.sub);
  }

  @UseGuards(AdminGuard)
  @Post('users/:id/breach-reset')
  processBreachReset(@Param('id') id: string, @Req() req) {
    return this.adminService.processBreachReset(id, req.admin.sub);
  }

  @UseGuards(AdminGuard)
  @Get('deposits/all')
  getAllDeposits(@Query('page') page = 1, @Query('status') status?: string) {
    return this.adminService.getAllDeposits(Number(page), 50, status);
  }

  @UseGuards(AdminGuard)
  @Post('deposits/:id/flag')
  flagDeposit(
    @Param('id') id: string,
    @Body() dto: { reason: string },
    @Req() req,
  ) {
    return this.adminService.flagDeposit(id, req.admin.sub, dto.reason);
  }

  @UseGuards(AdminGuard)
  @Get('withdrawals/all')
  getAllWithdrawals(@Query('page') page = 1, @Query('status') status?: string) {
    return this.adminService.getAllWithdrawals(Number(page), 50, status);
  }

  @UseGuards(AdminGuard)
  @Get('ledger')
  getTransactionLedger(
    @Query('page') page = 1,
    @Query('userId') userId?: string,
    @Query('type') type?: string,
  ) {
    return this.adminService.getTransactionLedger(Number(page), 50, {
      userId,
      type,
    });
  }

  @UseGuards(AdminGuard)
  @Get('referrals')
  getReferralOverview(@Query('page') page = 1) {
    return this.adminService.getReferralOverview(Number(page));
  }

  @UseGuards(AdminGuard)
  @Post('referrals/:id/disable')
  disableReferral(
    @Param('id') id: string,
    @Body() dto: { reason: string },
    @Req() req,
  ) {
    return this.adminService.disableReferralRewards(
      id,
      req.admin.sub,
      dto.reason,
    );
  }

  @UseGuards(AdminGuard)
  @Get('loyalty')
  getLoyaltyOverview(@Query('page') page = 1) {
    return this.adminService.getLoyaltyOverview(Number(page));
  }

  @UseGuards(AdminGuard)
  @Get('breached')
  getBreachedAccounts() {
    return this.adminService.getBreachedAccounts();
  }
}
