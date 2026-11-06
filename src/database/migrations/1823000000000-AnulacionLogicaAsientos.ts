import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Anulación lógica de asientos del libro de caja.
 *
 * Antes DELETE borraba el movimiento y se perdía el historial. Ahora el
 * asiento permanece con estado ANULADO, motivo, fecha y usuario, y deja de
 * afectar el saldo vigente.
 */
export class AnulacionLogicaAsientos1823000000000 implements MigrationInterface {
  name = 'AnulacionLogicaAsientos1823000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "asientos_caja"
      ADD COLUMN IF NOT EXISTS "estado" varchar(20) NOT NULL DEFAULT 'VIGENTE'
    `);

    await queryRunner.query(`
      ALTER TABLE "asientos_caja"
      ADD COLUMN IF NOT EXISTS "motivo_anulacion" varchar(250)
    `);

    await queryRunner.query(`
      ALTER TABLE "asientos_caja"
      ADD COLUMN IF NOT EXISTS "anulado_en" timestamptz
    `);

    await queryRunner.query(`
      ALTER TABLE "asientos_caja"
      ADD COLUMN IF NOT EXISTS "anulado_por" uuid
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'asientos_caja_estado_check'
        ) THEN
          ALTER TABLE "asientos_caja"
          ADD CONSTRAINT "asientos_caja_estado_check"
          CHECK ("estado" IN ('VIGENTE', 'ANULADO'));
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'asientos_caja_anulacion_check'
        ) THEN
          ALTER TABLE "asientos_caja"
          ADD CONSTRAINT "asientos_caja_anulacion_check"
          CHECK (
            ("estado" = 'VIGENTE'
              AND "motivo_anulacion" IS NULL
              AND "anulado_en" IS NULL
              AND "anulado_por" IS NULL)
            OR
            ("estado" = 'ANULADO'
              AND "motivo_anulacion" IS NOT NULL
              AND btrim("motivo_anulacion") <> ''
              AND "anulado_en" IS NOT NULL
              AND "anulado_por" IS NOT NULL)
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "asientos_caja_fondo_estado_idx"
      ON "asientos_caja" ("fondo_id", "estado")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "asientos_caja_fondo_estado_idx"`,
    );
    await queryRunner.query(`
      ALTER TABLE "asientos_caja"
      DROP CONSTRAINT IF EXISTS "asientos_caja_anulacion_check"
    `);
    await queryRunner.query(`
      ALTER TABLE "asientos_caja"
      DROP CONSTRAINT IF EXISTS "asientos_caja_estado_check"
    `);
    await queryRunner.query(`
      ALTER TABLE "asientos_caja" DROP COLUMN IF EXISTS "anulado_por"
    `);
    await queryRunner.query(`
      ALTER TABLE "asientos_caja" DROP COLUMN IF EXISTS "anulado_en"
    `);
    await queryRunner.query(`
      ALTER TABLE "asientos_caja" DROP COLUMN IF EXISTS "motivo_anulacion"
    `);
    await queryRunner.query(`
      ALTER TABLE "asientos_caja" DROP COLUMN IF EXISTS "estado"
    `);
  }
}
