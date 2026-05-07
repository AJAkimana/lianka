import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('roi_rates')
export class RoiRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @Column()
  timeframe: string;

  @Column({ type: 'numeric', precision: 8, scale: 4 })
  rate: number;

  @Column({ nullable: true })
  set_by: string;

  @CreateDateColumn()
  created_at: Date;
}
