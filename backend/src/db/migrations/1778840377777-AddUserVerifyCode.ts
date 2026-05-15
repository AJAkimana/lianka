import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserVerifyCode1778840377777 implements MigrationInterface {
    name = 'AddUserVerifyCode1778840377777'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "email_verify_code" character varying`);
        await queryRunner.query(`ALTER TABLE "withdrawals" ALTER COLUMN "network_fee" SET DEFAULT '2.1'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "withdrawals" ALTER COLUMN "network_fee" SET DEFAULT 2.1`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verify_code"`);
    }

}
