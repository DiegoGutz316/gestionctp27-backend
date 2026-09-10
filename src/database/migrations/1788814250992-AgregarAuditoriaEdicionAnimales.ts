import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarAuditoriaEdicionAnimales1788814250992 implements MigrationInterface {
  name = 'AgregarAuditoriaEdicionAnimales1788814250992';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "animales"
      ADD COLUMN "actualizado_en" timestamptz NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "animales"
      ADD COLUMN "actualizado_por" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "animales"
      ADD CONSTRAINT "fk_animales_actualizado_por"
      FOREIGN KEY ("actualizado_por")
      REFERENCES "usuarios" ("id")
      ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "animales"
      DROP CONSTRAINT IF EXISTS "fk_animales_actualizado_por"
    `);

    await queryRunner.query(`
      ALTER TABLE "animales"
      DROP COLUMN IF EXISTS "actualizado_por"
    `);

    await queryRunner.query(`
      ALTER TABLE "animales"
      DROP COLUMN IF EXISTS "actualizado_en"
    `);
  }
}
