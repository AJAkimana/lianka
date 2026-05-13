import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKycDocuments1778706060735 implements MigrationInterface {
  name = 'CreateKycDocuments1778706060735';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "kyc_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "document_type" character varying NOT NULL, "front_image_url" character varying, "back_image_url" character varying, "selfie_url" character varying, "full_name" character varying, "date_of_birth" date, "document_number" character varying, "nationality" character varying, "status" character varying NOT NULL DEFAULT 'SUBMITTED', "reviewed_by" character varying, "reviewed_at" TIMESTAMP WITH TIME ZONE, "rejection_reason" character varying, "admin_notes" character varying, "submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_02e49877f1578e6285f84e57ab6" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "kyc_documents"`);
  }
}
