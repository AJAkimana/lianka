import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWithdrawalAddresses1778706060724 implements MigrationInterface {
  name = 'CreateWithdrawalAddresses1778706060724';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "withdrawal_addresses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "network" character varying NOT NULL, "address" character varying NOT NULL, "is_verified" boolean NOT NULL DEFAULT true, "last_updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "next_update_allowed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_49fb7c23b1180c7a8e26cb0f1fb" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "withdrawal_addresses"`);
  }
}
