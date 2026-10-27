import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tras anular un asiento la clave de idempotencia se conserva con
 * asiento_id nulo. Así un reintento no finge un alta ni crea un duplicado.
 * No borra movimientos. En QA sustituye ON DELETE RESTRICT por SET NULL.
 */
export class IdempotenciaAsientoAnulado1820000000000
  implements MigrationInterface
{
  name = 'IdempotenciaAsientoAnulado1820000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "idempotencia_asientos"
      DROP CONSTRAINT IF EXISTS "fk_idempotencia_asiento"
    `);
    await queryRunner.query(`
      ALTER TABLE "idempotencia_asientos"
      DROP CONSTRAINT IF EXISTS "fk_idempotencia_asiento_asiento"
    `);
    await queryRunner.query(`
      ALTER TABLE "idempotencia_asientos"
      ALTER COLUMN "asiento_id" DROP NOT NULL
    `);
    // Limpia referencias huérfanas antes de recrear la FK.
    await queryRunner.query(`
      UPDATE "idempotencia_asientos" i
      SET "asiento_id" = NULL
      WHERE "asiento_id" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "asientos_caja" a WHERE a."id" = i."asiento_id"
        )
    `);
    await queryRunner.query(`
      ALTER TABLE "idempotencia_asientos"
      ADD CONSTRAINT "fk_idempotencia_asiento"
      FOREIGN KEY ("asiento_id") REFERENCES "asientos_caja"("id")
      ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "idempotencia_asientos"
      DROP CONSTRAINT IF EXISTS "fk_idempotencia_asiento"
    `);
  }
}
