import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('rank_history')
export class RankHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column()
  rank: string;

  @Column()
  rank_level: number;

  @CreateDateColumn()
  achieved_at: Date;
}
