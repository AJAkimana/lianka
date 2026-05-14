import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLedgerEntries1778706060734 implements MigrationInterface {
  name = 'CreateLedgerEntries1778706060734';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "ledger_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "reference_type" character varying NOT NULL, "reference_id" character varying, "entry_type" character varying NOT NULL, "wallet_type" character varying NOT NULL, "amount" numeric(18,8) NOT NULL, "balance_before" numeric(18,8) NOT NULL, "balance_after" numeric(18,8) NOT NULL, "description" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6efcb84411d3f08b08450ae75d5" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ledger_entries"`);
  }
}
