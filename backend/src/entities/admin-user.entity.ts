import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  user_id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column()
  full_name: string;

  @Column({ default: 'SUPPORT' })
  role: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true })
  two_fa_secret: string;

  @Column({ default: false })
  two_fa_enabled: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  last_login_at: Date;

  @Column({ nullable: true })
  last_login_ip: string;

  @Column({ nullable: true })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
