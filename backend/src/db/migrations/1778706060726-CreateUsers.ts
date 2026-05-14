import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1778706060726 implements MigrationInterface {
  name = 'CreateUsers1778706060726';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "full_name" character varying, "account_state" character varying NOT NULL DEFAULT 'INACTIVE', "kyc_status" character varying NOT NULL DEFAULT 'REQUIRED', "principal" numeric(18,8) NOT NULL DEFAULT '0', "active_deposit" numeric(18,8) NOT NULL DEFAULT '0', "total_profit" numeric(18,8) NOT NULL DEFAULT '0', "total_balance" numeric(18,8) NOT NULL DEFAULT '0', "timeframe" character varying NOT NULL DEFAULT 'DAILY', "cycle_start_date" TIMESTAMP WITH TIME ZONE, "grace_end_date" TIMESTAMP WITH TIME ZONE, "completed_cycles" integer NOT NULL DEFAULT '0', "trading_days_count" integer NOT NULL DEFAULT '0', "last_roi_date" date, "next_withdrawal_date" date, "breach_count" integer NOT NULL DEFAULT '0', "rank" character varying NOT NULL DEFAULT 'New Member', "rank_level" integer NOT NULL DEFAULT '1', "loyalty_score" numeric(5,2) NOT NULL DEFAULT '10', "referral_code" character varying, "referred_by" character varying, "two_fa_secret" character varying, "two_fa_enabled" boolean NOT NULL DEFAULT false, "email_verified" boolean NOT NULL DEFAULT false, "email_verify_token" character varying, "email_verify_expires" TIMESTAMP WITH TIME ZONE, "password_reset_token" character varying, "password_reset_expires" TIMESTAMP WITH TIME ZONE, "last_login_at" TIMESTAMP WITH TIME ZONE, "last_login_ip" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_ba10055f9ef9690e77cf6445cba" UNIQUE ("referral_code"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
