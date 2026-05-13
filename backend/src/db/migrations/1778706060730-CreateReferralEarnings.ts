import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReferralEarnings1778706060730 implements MigrationInterface {
  name = 'CreateReferralEarnings1778706060730';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "referral_earnings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "referral_id" character varying NOT NULL, "referrer_id" character varying NOT NULL, "referred_id" character varying NOT NULL, "earning_type" character varying NOT NULL, "amount" numeric(18,8) NOT NULL, "source_amount" numeric(18,8) NOT NULL, "rate_applied" numeric(8,4) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d5fa5a611a6f0f5d7f4907ab92b" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "referral_earnings"`);
  }
}
