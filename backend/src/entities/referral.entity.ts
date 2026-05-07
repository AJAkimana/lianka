import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  referrer_id: string;

  @Column({ unique: true })
  referred_id: string;

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ type: 'numeric', precision: 18, scale: 8, default: 0 })
  total_deposit_bonus: number;

  @Column({ type: 'numeric', precision: 18, scale: 8, default: 0 })
  total_roi_bonus: number;

  @Column({ type: 'timestamptz', nullable: true })
  activated_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
