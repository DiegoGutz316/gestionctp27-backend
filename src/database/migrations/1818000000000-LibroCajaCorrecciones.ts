import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Pie del informe económico por departamento y registro de idempotencia
 * de asientos, para que un reintento no duplique un movimiento.
 *
 * Es idempotente: en QA la tabla nació como idempotencia_asientos_caja.
 */
export class LibroCajaCorrecciones1818000000000 implements MigrationInterface {
  name = 'LibroCajaCorrecciones1818000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "fondos_caja"
      ADD COLUMN IF NOT EXISTS "pie_informe" jsonb
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.idempotencia_asientos') IS NULL
           AND to_regclass('public.idempotencia_asientos_caja') IS NOT NULL THEN
          ALTER TABLE "idempotencia_asientos_caja"
            RENAME TO "idempotencia_asientos";
        ELSIF to_regclass('public.idempotencia_asientos') IS NULL THEN
          CREATE TABLE "idempotencia_asientos" (
            "id"              serial        NOT NULL,
            "responsable_id"  uuid          NOT NULL,
            "clave"           uuid          NOT NULL,
            "huella"          char(64)      NOT NULL,
            "asiento_id"      integer       NOT NULL,
            "creado_en"       timestamptz   NOT NULL DEFAULT now(),
            CONSTRAINT "idempotencia_asientos_pk" PRIMARY KEY ("id"),
            CONSTRAINT "uq_idempotencia_asiento_responsable_clave"
              UNIQUE ("responsable_id", "clave")
          );
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "idempotencia_asientos"`);
    await queryRunner.query(
      `ALTER TABLE "fondos_caja" DROP COLUMN IF EXISTS "pie_informe"`,
    );
  }
}
