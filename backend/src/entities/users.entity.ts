import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column({ nullable: true })
  full_name: string;

  @Column({ default: 'INACTIVE' })
  account_state: string; // ACTIVE, GRACE, INACTIVE, TERMINATED, FROZEN

  @Column({ default: 'REQUIRED' })
  kyc_status: string; // REQUIRED, SUBMITTED, VERIFIED, REJECTED, NOT_REQUIRED

  // Financial core
  @Column({ type: 'numeric', precision: 18, scale: 8, default: 0 })
  principal: number;

  @Column({ type: 'numeric', precision: 18, scale: 8, default: 0 })
  active_deposit: number;

  @Column({ type: 'numeric', precision: 18, scale: 8, default: 0 })
  total_profit: number;

  @Column({ type: 'numeric', precision: 18, scale: 8, default: 0 })
  total_balance: number;

  // Cycle management
  @Column({ default: 'DAILY' })
  timeframe: string;

  @Column({ type: 'timestamptz', nullable: true })
  cycle_start_date: Date;

  @Column({ type: 'timestamptz', nullable: true })
  grace_end_date: Date;

  @Column({ default: 0 })
  completed_cycles: number;

  @Column({ default: 0 })
  trading_days_count: number;

  @Column({ type: 'date', nullable: true })
  last_roi_date: string;

  @Column({ type: 'date', nullable: true })
  next_withdrawal_date: string;

  @Column({ default: 0 })
  breach_count: number;

  // Rank
  @Column({ default: 'New Member' })
  rank: string;

  @Column({ default: 1 })
  rank_level: number;

  // Loyalty
  @Column({ type: 'numeric', precision: 5, scale: 2, default: 10 })
  loyalty_score: number;

  // Referral
  @Column({ nullable: true, unique: true })
  referral_code: string;

  @Column({ nullable: true })
  referred_by: string;

  // Security
  @Column({ nullable: true })
  two_fa_secret: string;

  @Column({ default: false })
  two_fa_enabled: boolean;

  @Column({ default: false })
  email_verified: boolean;

  @Column({ nullable: true })
  email_verify_token: string;

  @Column({ nullable: true })
  email_verify_code: string;

  @Column({ type: 'timestamptz', nullable: true })
  email_verify_expires: Date;

  @Column({ nullable: true })
  password_reset_token: string;

  @Column({ type: 'timestamptz', nullable: true })
  password_reset_expires: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_login_at: Date;

  @Column({ nullable: true })
  last_login_ip: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
