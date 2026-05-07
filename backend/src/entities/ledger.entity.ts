import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('ledger_entries')
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column()
  reference_type: string;

  @Column({ nullable: true })
  reference_id: string;

  @Column()
  entry_type: string; // CREDIT, DEBIT

  @Column()
  wallet_type: string;

  @Column({ type: 'numeric', precision: 18, scale: 8 })
  amount: number;

  @Column({ type: 'numeric', precision: 18, scale: 8 })
  balance_before: number;

  @Column({ type: 'numeric', precision: 18, scale: 8 })
  balance_after: number;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  created_at: Date;
}
