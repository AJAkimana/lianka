import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCycles1778706060737 implements MigrationInterface {
  name = 'CreateCycles1778706060737';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "cycles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "cycle_number" integer NOT NULL DEFAULT '1', "plan" character varying NOT NULL, "deposit_amount" numeric(18,8) NOT NULL, "peak_balance" numeric(18,8) NOT NULL DEFAULT '0', "profit_earned" numeric(18,8) NOT NULL DEFAULT '0', "profit_withdrawn" numeric(18,8) NOT NULL DEFAULT '0', "status" character varying NOT NULL DEFAULT 'ACTIVE', "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "grace_started_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_52e5eeb9c7c6e4ad1aed657967a" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "cycles"`);
  }
}
