import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('admin_logs')
export class AdminLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  admin_id: string;

  @Column()
  action: string;

  @Column()
  target_type: string;

  @Column({ nullable: true })
  target_id: string;

  @Column({ type: 'jsonb', nullable: true })
  before_state: any;

  @Column({ type: 'jsonb', nullable: true })
  after_state: any;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  ip_address: string;

  @CreateDateColumn()
  created_at: Date;
}
