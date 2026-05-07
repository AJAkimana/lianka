import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('kyc_documents')
export class KycDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column()
  document_type: string;

  @Column({ nullable: true })
  front_image_url: string;

  @Column({ nullable: true })
  back_image_url: string;

  @Column({ nullable: true })
  selfie_url: string;

  @Column({ nullable: true })
  full_name: string;

  @Column({ type: 'date', nullable: true })
  date_of_birth: string;

  @Column({ nullable: true })
  document_number: string;

  @Column({ nullable: true })
  nationality: string;

  @Column({ default: 'SUBMITTED' })
  status: string;

  @Column({ nullable: true })
  reviewed_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date;

  @Column({ nullable: true })
  rejection_reason: string;

  @Column({ nullable: true })
  admin_notes: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  submitted_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
