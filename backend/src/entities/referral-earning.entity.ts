import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('referral_earnings')
export class ReferralEarning {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  referral_id: string;

  @Column()
  referrer_id: string;

  @Column()
  referred_id: string;

  @Column()
  earning_type: string;

  @Column({ type: 'numeric', precision: 18, scale: 8 })
  amount: number;

  @Column({ type: 'numeric', precision: 18, scale: 8 })
  source_amount: number;

  @Column({ type: 'numeric', precision: 8, scale: 4 })
  rate_applied: number;

  @CreateDateColumn()
  created_at: Date;
}
