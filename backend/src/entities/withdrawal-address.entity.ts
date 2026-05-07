import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('withdrawal_addresses')
export class WithdrawalAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column()
  network: string;

  @Column()
  address: string;

  @Column({ default: true })
  is_verified: boolean;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  last_updated_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  next_update_allowed_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
