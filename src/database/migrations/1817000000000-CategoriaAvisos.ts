import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La categoría es opcional en las filas que ya existían: no se les asigna
 * una por el título ni la descripción. Los avisos nuevos la exigen en el DTO.
 */
export class CategoriaAvisos1817000000000 implements MigrationInterface {
  name = 'CategoriaAvisos1817000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "avisos"
      ADD COLUMN IF NOT EXISTS "categoria" varchar(20)
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'avisos_categoria_check'
        ) THEN
          ALTER TABLE "avisos"
          ADD CONSTRAINT "avisos_categoria_check"
          CHECK (
            "categoria" IS NULL
            OR "categoria" IN (
              'ACADEMICOS',
              'EVENTOS',
              'COMUNIDAD',
              'ADMINISTRATIVOS'
            )
          );
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "avisos" DROP CONSTRAINT IF EXISTS "avisos_categoria_check"
    `);
    await queryRunner.query(`
      ALTER TABLE "avisos" DROP COLUMN IF EXISTS "categoria"
    `);
  }
}
