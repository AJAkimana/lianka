import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly from = '"Lianka Platform" <bcebrain@gmail.com>';
  private readonly frontendUrl: string;

  constructor(private config: ConfigService) {
    this.frontendUrl = config.get('FRONTEND_URL', 'https://lianka.com');
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.get('GMAIL_USER'),
        pass: config.get('GMAIL_APP_PASSWORD'),
      },
    });
  }

  private async send(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`Email sent: ${subject} → ${to}`);
    } catch (err) {
      this.logger.error(`Email failed: ${subject} → ${to}`, err);
    }
  }

  private base(content: string, title: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111111;border-radius:12px;overflow:hidden;border:1px solid #1a1a1a;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0a2a0a,#0d3d0d);padding:32px 40px;text-align:center;border-bottom:2px solid #00C853;">
            <span style="font-size:36px;font-weight:900;color:#00C853;letter-spacing:4px;">LIANKA</span>
            <p style="color:#aaa;margin:8px 0 0;font-size:13px;letter-spacing:2px;">INTELLIGENT CAPITAL</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;background:#0d0d0d;border-top:1px solid #1a1a1a;text-align:center;">
            <p style="color:#555;font-size:12px;margin:0;">© 2024 Lianka Investment Platform. All rights reserved.</p>
            <p style="color:#555;font-size:11px;margin:8px 0 0;">This is an automated message. Do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  async sendEmailVerification(
    email: string,
    token: string,
    code: string,
    name?: string,
  ) {
    const link = `${this.frontendUrl}/verify-email?token=${token}`;
    const html = this.base(
      `
      <h2 style="color:#fff;margin:0 0 8px;">Verify Your Email</h2>
      <p style="color:#aaa;margin:0 0 24px;">Hi ${name || 'there'}, welcome to Lianka.</p>
      <p style="color:#ccc;line-height:1.6;">Click the button below to verify your email address and activate your account.</p>
      <div style="text-align:center;margin:24px 0;">
        <div style="display:inline-block;background:#0d0d0d;border:1px solid #1a1a1a;border-radius:8px;padding:10px 16px;">
          <span style="color:#00C853;font-size:20px;letter-spacing:4px;font-weight:800;">${code}</span>
        </div>
        <p style="color:#666;font-size:12px;margin:8px 0 0;">Or enter this 6-digit code on the verification screen.</p>
      </div>
      <div style="text-align:center;margin:32px 0;">
        <a href="${link}" style="background:#00C853;color:#000;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">Verify Email</a>
      </div>
      <p style="color:#666;font-size:13px;">This link expires in 24 hours. If you did not create this account, ignore this email.</p>
      <p style="color:#444;font-size:12px;word-break:break-all;">Or copy: ${link}</p>
    `,
      'Verify Your Email',
    );
    await this.send(email, 'Verify your Lianka account', html);
  }

  async sendPasswordReset(email: string, token: string, name?: string) {
    const link = `${this.frontendUrl}/reset-password?token=${token}`;
    const html = this.base(
      `
      <h2 style="color:#fff;margin:0 0 8px;">Reset Your Password</h2>
      <p style="color:#aaa;margin:0 0 24px;">Hi ${name || 'there'},</p>
      <p style="color:#ccc;line-height:1.6;">A password reset was requested for your account. Click below to set a new password.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${link}" style="background:#00C853;color:#000;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">Reset Password</a>
      </div>
      <p style="color:#666;font-size:13px;">This link expires in 1 hour. If you did not request this, your account is safe — ignore this email.</p>
    `,
      'Reset Password',
    );
    await this.send(email, 'Reset your Lianka password', html);
  }

  async sendPasswordChangedAlert(email: string, name?: string) {
    const html = this.base(
      `
      <h2 style="color:#fff;margin:0 0 8px;">Password Changed</h2>
      <p style="color:#aaa;margin:0 0 24px;">Hi ${name || 'there'},</p>
      <p style="color:#ccc;line-height:1.6;">Your Lianka account password was changed successfully.</p>
      <p style="color:#F9A825;line-height:1.6;">If you did not make this change, contact support immediately.</p>
    `,
      'Password Changed',
    );
    await this.send(email, 'Your Lianka password was changed', html);
  }

  async sendDepositConfirmed(
    email: string,
    name: string,
    amount: number,
    network: string,
    txid: string,
  ) {
    const html = this.base(
      `
      <h2 style="color:#00C853;margin:0 0 8px;">Deposit Confirmed ✓</h2>
      <p style="color:#aaa;margin:0 0 24px;">Hi ${name},</p>
      <p style="color:#ccc;">Your deposit has been confirmed and credited to your account.</p>
      <table width="100%" style="margin:24px 0;border-collapse:collapse;">
        <tr><td style="color:#888;padding:10px 0;border-bottom:1px solid #222;">Amount</td><td style="color:#00C853;text-align:right;font-weight:700;">$${amount.toFixed(2)} USDT</td></tr>
        <tr><td style="color:#888;padding:10px 0;border-bottom:1px solid #222;">Network</td><td style="color:#fff;text-align:right;">${network}</td></tr>
        <tr><td style="color:#888;padding:10px 0;">Transaction ID</td><td style="color:#fff;text-align:right;font-size:12px;word-break:break-all;">${txid}</td></tr>
      </table>
      <p style="color:#ccc;">Your cycle is now active and earning daily ROI.</p>
    `,
      'Deposit Confirmed',
    );
    await this.send(email, 'Deposit confirmed — Lianka', html);
  }

  async sendDepositRejected(
    email: string,
    name: string,
    amount: number,
    reason: string,
  ) {
    const html = this.base(
      `
      <h2 style="color:#C1121F;margin:0 0 8px;">Deposit Rejected</h2>
      <p style="color:#aaa;margin:0 0 24px;">Hi ${name},</p>
      <p style="color:#ccc;">Your deposit submission of $${amount.toFixed(2)} USDT was rejected.</p>
      <div style="background:#1a0000;border:1px solid #C1121F;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="color:#ff6b6b;margin:0;font-weight:600;">Reason: ${reason}</p>
      </div>
      <p style="color:#ccc;">Please submit a new deposit with the correct transaction details.</p>
    `,
      'Deposit Rejected',
    );
    await this.send(email, 'Deposit rejected — Lianka', html);
  }

  async sendWithdrawalRequested(
    email: string,
    name: string,
    amount: number,
    finalAmount: number,
    address: string,
    network: string,
  ) {
    const html = this.base(
      `
      <h2 style="color:#fff;margin:0 0 8px;">Withdrawal Requested</h2>
      <p style="color:#aaa;margin:0 0 24px;">Hi ${name},</p>
      <p style="color:#ccc;">Your withdrawal request has been submitted and is pending admin approval.</p>
      <table width="100%" style="margin:24px 0;border-collapse:collapse;">
        <tr><td style="color:#888;padding:10px 0;border-bottom:1px solid #222;">Requested Amount</td><td style="color:#fff;text-align:right;font-weight:700;">$${amount.toFixed(2)}</td></tr>
        <tr><td style="color:#888;padding:10px 0;border-bottom:1px solid #222;">Network Fee</td><td style="color:#F9A825;text-align:right;">~$2.10</td></tr>
        <tr><td style="color:#888;padding:10px 0;border-bottom:1px solid #222;">You Will Receive</td><td style="color:#00C853;text-align:right;font-weight:700;">$${finalAmount.toFixed(2)}</td></tr>
        <tr><td style="color:#888;padding:10px 0;border-bottom:1px solid #222;">Network</td><td style="color:#fff;text-align:right;">${network}</td></tr>
        <tr><td style="color:#888;padding:10px 0;">To Address</td><td style="color:#fff;text-align:right;font-size:12px;word-break:break-all;">${address}</td></tr>
      </table>
      <p style="color:#888;font-size:13px;">Processing time: 24–72 hours. You will be notified once sent.</p>
    `,
      'Withdrawal Requested',
    );
    await this.send(email, 'Withdrawal request received — Lianka', html);
  }

  async sendWithdrawalCompleted(
    email: string,
    name: string,
    finalAmount: number,
    txid: string,
    address: string,
  ) {
    const html = this.base(
      `
      <h2 style="color:#00C853;margin:0 0 8px;">Withdrawal Sent ✓</h2>
      <p style="color:#aaa;margin:0 0 24px;">Hi ${name},</p>
      <p style="color:#ccc;">Your withdrawal has been processed and sent to your wallet.</p>
      <table width="100%" style="margin:24px 0;border-collapse:collapse;">
        <tr><td style="color:#888;padding:10px 0;border-bottom:1px solid #222;">Amount Sent</td><td style="color:#00C853;text-align:right;font-weight:700;">$${finalAmount.toFixed(2)} USDT</td></tr>
        <tr><td style="color:#888;padding:10px 0;border-bottom:1px solid #222;">To Address</td><td style="color:#fff;text-align:right;font-size:12px;word-break:break-all;">${address}</td></tr>
        <tr><td style="color:#888;padding:10px 0;">Transaction ID</td><td style="color:#fff;text-align:right;font-size:12px;word-break:break-all;">${txid}</td></tr>
      </table>
      <p style="color:#888;font-size:13px;">It may take a few minutes to appear depending on network confirmations.</p>
    `,
      'Withdrawal Sent',
    );
    await this.send(email, 'Withdrawal sent — Lianka', html);
  }

  async sendWithdrawalRejected(
    email: string,
    name: string,
    amount: number,
    reason: string,
  ) {
    const html = this.base(
      `
      <h2 style="color:#C1121F;margin:0 0 8px;">Withdrawal Rejected</h2>
      <p style="color:#aaa;margin:0 0 24px;">Hi ${name},</p>
      <p style="color:#ccc;">Your withdrawal of $${amount.toFixed(2)} was rejected. Funds have been returned to your wallet.</p>
      <div style="background:#1a0000;border:1px solid #C1121F;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="color:#ff6b6b;margin:0;font-weight:600;">Reason: ${reason}</p>
      </div>
    `,
      'Withdrawal Rejected',
    );
    await this.send(email, 'Withdrawal rejected — Lianka', html);
  }

  async sendKYCApproved(email: string, name: string) {
    const html = this.base(
      `
      <h2 style="color:#00C853;margin:0 0 8px;">KYC Verified ✓</h2>
      <p style="color:#aaa;margin:0 0 24px;">Hi ${name},</p>
      <p style="color:#ccc;">Your identity has been verified. You can now withdraw your profits.</p>
    `,
      'KYC Approved',
    );
    await this.send(email, 'Identity verified — Lianka', html);
  }

  async sendKYCRejected(email: string, name: string, reason: string) {
    const html = this.base(
      `
      <h2 style="color:#C1121F;margin:0 0 8px;">KYC Verification Failed</h2>
      <p style="color:#aaa;margin:0 0 24px;">Hi ${name},</p>
      <p style="color:#ccc;">Your KYC submission was rejected.</p>
      <div style="background:#1a0000;border:1px solid #C1121F;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="color:#ff6b6b;margin:0;font-weight:600;">Reason: ${reason}</p>
      </div>
      <p style="color:#ccc;">Please resubmit with the correct documents.</p>
    `,
      'KYC Rejected',
    );
    await this.send(email, 'KYC verification failed — Lianka', html);
  }

  async sendAccountTerminated(
    email: string,
    name: string,
    terminationFee: number,
  ) {
    const html = this.base(
      `
      <h2 style="color:#C1121F;margin:0 0 8px;">Account Closed</h2>
      <p style="color:#aaa;margin:0 0 24px;">Hi ${name},</p>
      <p style="color:#ccc;">Your account has been closed because your balance fell below your principal amount.</p>
      ${terminationFee > 0 ? `<p style="color:#F9A825;">Termination fee applied: $${terminationFee.toFixed(2)}. Reach 80% loyalty score to waive this fee in future cycles.</p>` : ''}
      <p style="color:#888;font-size:13px;">Contact support if you have questions.</p>
    `,
      'Account Terminated',
    );
    await this.send(email, 'Account closed — Lianka', html);
  }

  async sendRankUp(email: string, name: string, rank: string) {
    const html = this.base(
      `
      <h2 style="color:#00C853;margin:0 0 8px;">Rank Achieved: ${rank} 🏆</h2>
      <p style="color:#aaa;margin:0 0 24px;">Hi ${name},</p>
      <p style="color:#ccc;">Congratulations! You have advanced to <strong style="color:#00C853;">${rank}</strong> rank. New privileges are now unlocked.</p>
    `,
      'Rank Up',
    );
    await this.send(email, `You reached ${rank} rank — Lianka`, html);
  }
}
