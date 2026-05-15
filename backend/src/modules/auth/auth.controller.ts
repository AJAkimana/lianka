import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ResendVerifyDto,
  RequestResetDto,
  ResetPasswordDto,
  ChangePasswordDto,
  Verify2FADto,
  Disable2FADto,
} from './auth.dto';

@ApiTags('auth')
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req) {
    return this.authService.login(dto, req.ip);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Get('verify-email/:token')
  verifyEmailGet(@Param('token') token: string) {
    return this.authService.verifyEmail({ token });
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerifyDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body('refresh_token') token: string) {
    return this.authService.refresh(token);
  }

  @Post('request-password-reset')
  requestReset(@Body() dto: RequestResetDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.new_password);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@Body() dto: ChangePasswordDto, @Req() req) {
    return this.authService.changePassword(
      req.user.id,
      dto.current_password,
      dto.new_password,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  setup2FA(@Req() req) {
    return this.authService.setup2FA(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify')
  verify2FA(@Body() dto: Verify2FADto, @Req() req) {
    return this.authService.verify2FA(req.user.id, dto.code);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  disable2FA(@Body() dto: Disable2FADto, @Req() req) {
    return this.authService.disable2FA(req.user.id, dto.code);
  }
}
