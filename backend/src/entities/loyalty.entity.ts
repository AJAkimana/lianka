import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('loyalty_snapshots')
export class LoyaltySnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  completed_cycles_score: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  redeposit_score: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  no_breach_score: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  timeframe_score: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  account_age_score: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  referral_quality_score: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  promotion_score: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  total_score: number;

  @CreateDateColumn()
  created_at: Date;
}
