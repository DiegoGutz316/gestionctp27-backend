import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El flyer de un aviso institucional se guarda en la misma fila. Así sigue
 * disponible en el servidor aunque el disco del despliegue se reinicie.
 */
export class FlyerAvisos1816000000000 implements MigrationInterface {
  name = 'FlyerAvisos1816000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "avisos"
      ADD COLUMN IF NOT EXISTS "flyer" bytea,
      ADD COLUMN IF NOT EXISTS "flyer_tipo" varchar(40)
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'avisos_flyer_tipo_check'
        ) THEN
          ALTER TABLE "avisos"
          ADD CONSTRAINT "avisos_flyer_tipo_check"
          CHECK (
            "flyer_tipo" IS NULL
            OR "flyer_tipo" IN ('image/jpeg', 'image/png', 'image/webp')
          );
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "avisos" DROP CONSTRAINT IF EXISTS "avisos_flyer_tipo_check"
    `);
    await queryRunner.query(`
      ALTER TABLE "avisos"
      DROP COLUMN IF EXISTS "flyer_tipo",
      DROP COLUMN IF EXISTS "flyer"
    `);
  }
}
