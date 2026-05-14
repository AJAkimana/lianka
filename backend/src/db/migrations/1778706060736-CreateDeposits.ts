import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeposits1778706060736 implements MigrationInterface {
  name = 'CreateDeposits1778706060736';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "deposits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "amount" numeric(18,8) NOT NULL, "network" character varying NOT NULL, "txid" character varying NOT NULL, "plan" character varying NOT NULL DEFAULT 'DAILY', "status" character varying NOT NULL DEFAULT 'PENDING', "reviewed_by" character varying, "reviewed_at" TIMESTAMP WITH TIME ZONE, "rejection_reason" character varying, "admin_notes" character varying, "is_duplicate" boolean NOT NULL DEFAULT false, "submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f49ba0cd446eaf7abb4953385d9" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "deposits"`);
  }
}
