import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotifications1778706060732 implements MigrationInterface {
  name = 'CreateNotifications1778706060732';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "type" character varying NOT NULL, "title" character varying NOT NULL, "message" character varying NOT NULL, "dot_color" character varying NOT NULL DEFAULT 'green', "is_read" boolean NOT NULL DEFAULT false, "is_critical" boolean NOT NULL DEFAULT false, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
