import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('cycles')
export class Cycle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column({ default: 1 })
  cycle_number: number;

  @Column()
  plan: string;

  @Column({ type: 'numeric', precision: 18, scale: 8 })
  deposit_amount: number;

  @Column({ type: 'numeric', precision: 18, scale: 8, default: 0 })
  peak_balance: number;

  @Column({ type: 'numeric', precision: 18, scale: 8, default: 0 })
  profit_earned: number;

  @Column({ type: 'numeric', precision: 18, scale: 8, default: 0 })
  profit_withdrawn: number;

  @Column({ default: 'ACTIVE' })
  status: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  grace_started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
