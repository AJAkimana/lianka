import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import { KycDocument } from '../../entities/kyc-document.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class KycService {
  constructor(
    @InjectRepository(KycDocument)
    private repo: Repository<KycDocument>,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
  ) {}

  async getStatus(userId: string) {
    const user = await this.usersService.findById(userId);
    const latest = await this.repo.findOne({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
    return {
      kyc_status: user.kyc_status,
      document: latest || null,
    };
  }

  async submit(dto: {
    userId: string;
    document_type: string;
    full_name: string;
    date_of_birth: string;
    document_number: string;
    nationality: string;
    files: Express.Multer.File[];
  }) {
    const user = await this.usersService.findById(dto.userId);

    if (user.kyc_status === 'VERIFIED') {
      throw new BadRequestException('Your identity is already verified');
    }

    if (user.kyc_status === 'SUBMITTED') {
      throw new BadRequestException('Your KYC is already under review');
    }

    const validTypes = ['PASSPORT', 'NATIONAL_ID', 'DRIVERS_LICENSE'];
    if (!validTypes.includes(dto.document_type)) {
      throw new BadRequestException('Invalid document type');
    }

    // Map uploaded files
    const fileMap: Record<string, string> = {};
    (dto.files || []).forEach((f, i) => {
      if (i === 0) fileMap.front = `/uploads/kyc/${f.filename}`;
      if (i === 1) fileMap.back = `/uploads/kyc/${f.filename}`;
      if (i === 2) fileMap.selfie = `/uploads/kyc/${f.filename}`;
    });

    const doc = await this.repo.save({
      user_id: dto.userId,
      document_type: dto.document_type,
      full_name: dto.full_name,
      date_of_birth: dto.date_of_birth,
      document_number: dto.document_number,
      nationality: dto.nationality,
      front_image_url: fileMap.front,
      back_image_url: fileMap.back,
      selfie_url: fileMap.selfie,
      status: 'SUBMITTED',
    });

    // Update user KYC status
    user.kyc_status = 'SUBMITTED';
    await this.usersService.save(user);

    await this.notificationsService.create({
      user_id: dto.userId,
      type: 'SYSTEM_ALERT',
      title: 'KYC Submitted',
      message:
        'Your identity documents have been submitted. Verification takes up to 24 hours.',
      dot_color: 'blue',
    });

    return {
      message: 'KYC documents submitted successfully',
      document_id: doc.id,
    };
  }

  async findPending() {
    return this.repo.find({
      where: { status: 'SUBMITTED' },
      order: { submitted_at: 'ASC' },
    });
  }

  async approve(docId: string, adminId: string) {
    const doc = await this.repo.findOne({ where: { id: docId } });
    if (!doc || doc.status !== 'SUBMITTED') {
      throw new BadRequestException('Document not found or not pending');
    }

    doc.status = 'APPROVED';
    doc.reviewed_by = adminId;
    doc.reviewed_at = new Date();
    await this.repo.save(doc);

    const user = await this.usersService.findById(doc.user_id);
    user.kyc_status = 'VERIFIED';
    await this.usersService.save(user);

    await this.notificationsService.create({
      user_id: doc.user_id,
      type: 'KYC_APPROVED',
      title: 'Identity Verified ✓',
      message:
        'Your KYC verification is complete. You can now withdraw your profits.',
      dot_color: 'green',
      is_critical: true,
    });

    await this.emailService.sendKYCApproved(user.email, user.full_name);

    return { message: 'KYC approved', user_id: doc.user_id };
  }

  async reject(docId: string, adminId: string, reason: string) {
    const doc = await this.repo.findOne({ where: { id: docId } });
    if (!doc || doc.status !== 'SUBMITTED') {
      throw new BadRequestException('Document not found or not pending');
    }

    doc.status = 'REJECTED';
    doc.reviewed_by = adminId;
    doc.reviewed_at = new Date();
    doc.rejection_reason = reason;
    await this.repo.save(doc);

    const user = await this.usersService.findById(doc.user_id);
    user.kyc_status = 'REJECTED';
    await this.usersService.save(user);

    await this.notificationsService.create({
      user_id: doc.user_id,
      type: 'KYC_REJECTED',
      title: 'KYC Verification Failed',
      message: `Your KYC was rejected: ${reason}. Please resubmit with correct documents.`,
      dot_color: 'red',
      is_critical: true,
    });

    await this.emailService.sendKYCRejected(user.email, user.full_name, reason);

    return { message: 'KYC rejected' };
  }
}
