import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backlog 5.7: editar o desactivar un aviso no lo borra. Estas columnas
 * guardan la fecha y el usuario de la ultima modificacion.
 */
export class AuditoriaEdicionAvisos1815000000000 implements MigrationInterface {
  name = 'AuditoriaEdicionAvisos1815000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "avisos"
      ADD COLUMN IF NOT EXISTS "actualizado_en" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "actualizado_por" uuid
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_avisos_actualizado_por'
        ) THEN
          ALTER TABLE "avisos"
          ADD CONSTRAINT "fk_avisos_actualizado_por"
          FOREIGN KEY ("actualizado_por") REFERENCES "usuarios"("id")
          ON DELETE RESTRICT;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "avisos" DROP CONSTRAINT IF EXISTS "fk_avisos_actualizado_por"
    `);
    await queryRunner.query(`
      ALTER TABLE "avisos"
      DROP COLUMN IF EXISTS "actualizado_por",
      DROP COLUMN IF EXISTS "actualizado_en"
    `);
  }
}
