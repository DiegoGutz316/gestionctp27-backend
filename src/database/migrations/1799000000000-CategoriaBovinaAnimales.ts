import { MigrationInterface, QueryRunner } from 'typeorm';

export class CategoriaBovinaAnimales1799000000000 implements MigrationInterface {
  name = 'CategoriaBovinaAnimales1799000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "animales"
      ADD COLUMN "categoria_bovina" varchar(20)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "animales"
      DROP COLUMN IF EXISTS "categoria_bovina"
    `);
  }
}
