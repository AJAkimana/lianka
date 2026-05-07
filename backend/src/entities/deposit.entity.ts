import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('deposits')
export class Deposit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column({ type: 'numeric', precision: 18, scale: 8 })
  amount: number;

  @Column()
  network: string;

  @Column()
  txid: string;

  @Column({ default: 'DAILY' })
  plan: string;

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ nullable: true })
  reviewed_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date;

  @Column({ nullable: true })
  rejection_reason: string;

  @Column({ nullable: true })
  admin_notes: string;

  @Column({ default: false })
  is_duplicate: boolean;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  submitted_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
