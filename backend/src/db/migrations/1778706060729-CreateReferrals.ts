import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReferrals1778706060729 implements MigrationInterface {
  name = 'CreateReferrals1778706060729';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "referrals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "referrer_id" character varying NOT NULL, "referred_id" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'PENDING', "total_deposit_bonus" numeric(18,8) NOT NULL DEFAULT '0', "total_roi_bonus" numeric(18,8) NOT NULL DEFAULT '0', "activated_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_507a2818bf5524662b068c2e81c" UNIQUE ("referred_id"), CONSTRAINT "PK_ea9980e34f738b6252817326c08" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "referrals"`);
  }
}
