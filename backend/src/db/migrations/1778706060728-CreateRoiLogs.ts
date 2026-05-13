import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRoiLogs1778706060728 implements MigrationInterface {
  name = 'CreateRoiLogs1778706060728';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "roi_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "date" date NOT NULL, "timeframe" character varying NOT NULL, "rate_applied" numeric(8,4) NOT NULL, "active_deposit" numeric(18,8) NOT NULL, "profit_earned" numeric(18,8) NOT NULL, "total_profit_after" numeric(18,8) NOT NULL, "total_balance_after" numeric(18,8) NOT NULL, "triggered_grace" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d5f523693b0f90caf74f3e679a3" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "roi_logs"`);
  }
}
