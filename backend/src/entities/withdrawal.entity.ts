import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('withdrawals')
export class Withdrawal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column()
  wallet_type: string;

  @Column({ type: 'numeric', precision: 18, scale: 8 })
  amount: number;

  @Column({ type: 'numeric', precision: 18, scale: 8, default: 2.10 })
  network_fee: number;

  @Column({ type: 'numeric', precision: 18, scale: 8 })
  final_amount: number;

  @Column({ type: 'numeric', precision: 18, scale: 8, default: 0 })
  termination_fee: number;

  @Column()
  address: string;

  @Column()
  network: string;

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ nullable: true })
  reviewed_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date;

  @Column({ nullable: true })
  rejection_reason: string;

  @Column({ nullable: true })
  admin_notes: string;

  @Column({ nullable: true })
  txid_sent: string;

  @Column({ type: 'numeric', precision: 18, scale: 8, nullable: true })
  snapshot_profit_balance: number;

  @Column({ type: 'numeric', precision: 18, scale: 8, nullable: true })
  snapshot_total_balance: number;

  @Column({ type: 'numeric', precision: 18, scale: 8, nullable: true })
  snapshot_principal: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  snapshot_loyalty_score: number;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  requested_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
