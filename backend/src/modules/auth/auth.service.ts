import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as authenticator from 'otplib';
import * as QRCode from 'qrcode';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { ReferralsService } from '../referrals/referrals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WalletsService } from '../wallets/wallets.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private walletsService: WalletsService,
    private emailService: EmailService,
    private referralsService: ReferralsService,
    private notificationsService: NotificationsService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  // ─── Registration ────────────────────────────────────────

  async register(dto: {
    email: string;
    password: string;
    full_name?: string;
    referral_code?: string;
  }) {
    const email = dto.email.toLowerCase().trim();

    // Check duplicate
    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new ConflictException('Email already registered');

    // Password strength
    if (dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // Hash password
    const password_hash = await bcrypt.hash(dto.password, 12);

    // Email verify token + code
    const email_verify_token = crypto.randomBytes(32).toString('hex');
    const email_verify_code = crypto
      .randomInt(0, 1000000)
      .toString()
      .padStart(6, '0');
    const email_verify_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Find referrer
    let referred_by: string | null = null;
    if (dto.referral_code) {
      const referrer = await this.usersService.findByReferralCode(
        dto.referral_code,
      );
      if (referrer) referred_by = referrer.id;
    }

    // Create user
    const user = await this.usersService.create({
      email,
      password_hash,
      full_name: dto.full_name,
      email_verify_token,
      email_verify_code,
      email_verify_expires,
      referred_by,
      account_state: 'INACTIVE',
    });

    // Create 3 wallets
    await this.walletsService.createUserWallets(user.id);

    // Link referral
    if (referred_by) {
      await this.referralsService.createReferral(referred_by, user.id);
    }

    // Send verification email
    await this.emailService.sendEmailVerification(
      email,
      email_verify_token,
      email_verify_code,
      dto.full_name,
    );

    return {
      message: 'Account created. Please verify your email.',
      user_id: user.id,
    };
  }

  // ─── Email Verification ──────────────────────────────────

  async verifyEmail(dto: { token?: string; code?: string }) {
    const lookup = dto.token || dto.code;
    if (!lookup) {
      throw new BadRequestException('Verification token or code is required');
    }

    const user = await this.usersService.findByEmailVerifyToken(lookup);
    if (!user)
      throw new BadRequestException('Invalid or expired verification link');

    if (user.email_verify_expires < new Date()) {
      throw new BadRequestException(
        'Verification link has expired. Request a new one.',
      );
    }

    user.email_verified = true;
    user.email_verify_token = null;
    user.email_verify_code = null;
    user.email_verify_expires = null;
    await this.usersService.save(user);

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email.toLowerCase());
    if (!user) throw new BadRequestException('Email not found');
    if (user.email_verified)
      throw new BadRequestException('Email already verified');

    const token = crypto.randomBytes(32).toString('hex');
    const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    user.email_verify_token = token;
    user.email_verify_code = code;
    user.email_verify_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.usersService.save(user);

    await this.emailService.sendEmailVerification(
      user.email,
      token,
      code,
      user.full_name,
    );
    return { message: 'Verification email resent' };
  }

  // ─── Login ───────────────────────────────────────────────

  async login(
    dto: { email: string; password: string; totp_code?: string },
    ip: string,
  ) {
    const user = await this.usersService.findByEmail(dto.email.toLowerCase());
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (!user.email_verified) {
      throw new ForbiddenException('Please verify your email first');
    }

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // 2FA check
    if (user.two_fa_enabled) {
      if (!dto.totp_code) {
        return { requires_2fa: true, message: 'Enter your 2FA code' };
      }
      const isValid = authenticator.verify({
        token: dto.totp_code,
        secret: user.two_fa_secret,
      });
      if (!isValid) throw new UnauthorizedException('Invalid 2FA code');
    }

    await this.usersService.updateLastLogin(user.id, ip);

    const tokens = await this.generateTokens(user.id, user.email);
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        account_state: user.account_state,
        kyc_status: user.kyc_status,
        rank: user.rank,
        rank_level: user.rank_level,
      },
    };
  }

  // ─── Token Management ────────────────────────────────────

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const user = await this.usersService.findById(payload.sub);
      const tokens = await this.generateTokens(user.id, user.email);
      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '7d'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '30d'),
      }),
    ]);
    return { access_token, refresh_token };
  }

  // ─── Password Reset ──────────────────────────────────────

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email.toLowerCase());
    // Always return success to prevent email enumeration
    if (!user)
      return { message: 'If that email exists, a reset link was sent' };

    const token = crypto.randomBytes(32).toString('hex');
    user.password_reset_token = token;
    user.password_reset_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.usersService.save(user);

    await this.emailService.sendPasswordReset(
      user.email,
      token,
      user.full_name,
    );
    return { message: 'If that email exists, a reset link was sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByPasswordResetToken(token);
    if (!user || user.password_reset_expires < new Date()) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    user.password_hash = await bcrypt.hash(newPassword, 12);
    user.password_reset_token = null;
    user.password_reset_expires = null;
    await this.usersService.save(user);

    await this.emailService.sendPasswordChangedAlert(
      user.email,
      user.full_name,
    );
    return { message: 'Password reset successfully' };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersService.findById(userId);
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    if (newPassword.length < 8) {
      throw new BadRequestException(
        'New password must be at least 8 characters',
      );
    }

    user.password_hash = await bcrypt.hash(newPassword, 12);
    await this.usersService.save(user);
    await this.emailService.sendPasswordChangedAlert(
      user.email,
      user.full_name,
    );
    return { message: 'Password changed successfully' };
  }

  // ─── 2FA Setup ───────────────────────────────────────────

  async setup2FA(userId: string) {
    const user = await this.usersService.findById(userId);
    if (user.two_fa_enabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.generateURI({
      label: user.email,
      issuer: 'Lianka',
      secret,
    });
    const qrCode = await QRCode.toDataURL(otpAuthUrl);

    // Save secret temporarily (not yet enabled)
    user.two_fa_secret = secret;
    await this.usersService.save(user);

    return {
      secret,
      qr_code: qrCode,
      message: 'Scan QR code with your authenticator app then verify',
    };
  }

  async verify2FA(userId: string, totpCode: string) {
    const user = await this.usersService.findById(userId);
    if (!user.two_fa_secret) {
      throw new BadRequestException('Start 2FA setup first');
    }

    const isValid = authenticator.verify({
      token: totpCode,
      secret: user.two_fa_secret,
    });

    if (!isValid) throw new BadRequestException('Invalid code');

    user.two_fa_enabled = true;
    await this.usersService.save(user);

    return { message: '2FA enabled successfully' };
  }

  async disable2FA(userId: string, totpCode: string) {
    const user = await this.usersService.findById(userId);
    if (!user.two_fa_enabled)
      throw new BadRequestException('2FA is not enabled');

    const isValid = authenticator.verify({
      token: totpCode,
      secret: user.two_fa_secret,
    });

    if (!isValid) throw new UnauthorizedException('Invalid 2FA code');

    user.two_fa_enabled = false;
    user.two_fa_secret = null;
    await this.usersService.save(user);

    return { message: '2FA disabled successfully' };
  }
}
