import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRoiRates1778706060727 implements MigrationInterface {
  name = 'CreateRoiRates1778706060727';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "roi_rates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "timeframe" character varying NOT NULL, "rate" numeric(8,4) NOT NULL, "set_by" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_15eed5bdc2591ad9a6fbbf68763" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "roi_rates"`);
  }
}
