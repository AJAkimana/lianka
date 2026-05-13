import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminLogs1778706060739 implements MigrationInterface {
  name = 'CreateAdminLogs1778706060739';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "admin_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "admin_id" character varying NOT NULL, "action" character varying NOT NULL, "target_type" character varying NOT NULL, "target_id" character varying, "before_state" jsonb, "after_state" jsonb, "notes" character varying, "ip_address" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bd116497b175ab12373dcb362b" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "admin_logs"`);
  }
}
