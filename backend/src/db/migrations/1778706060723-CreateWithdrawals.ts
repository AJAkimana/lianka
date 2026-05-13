import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWithdrawals1778706060723 implements MigrationInterface {
  name = 'CreateWithdrawals1778706060723';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "withdrawals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "wallet_type" character varying NOT NULL, "amount" numeric(18,8) NOT NULL, "network_fee" numeric(18,8) NOT NULL DEFAULT '2.1', "final_amount" numeric(18,8) NOT NULL, "termination_fee" numeric(18,8) NOT NULL DEFAULT '0', "address" character varying NOT NULL, "network" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'PENDING', "reviewed_by" character varying, "reviewed_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, "rejection_reason" character varying, "admin_notes" character varying, "txid_sent" character varying, "snapshot_profit_balance" numeric(18,8), "snapshot_total_balance" numeric(18,8), "snapshot_principal" numeric(18,8), "snapshot_loyalty_score" numeric(5,2), "requested_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9871ec481baa7755f8bd8b7c7e9" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "withdrawals"`);
  }
}
