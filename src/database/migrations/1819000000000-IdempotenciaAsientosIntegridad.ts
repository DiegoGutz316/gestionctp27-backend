import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Completa el esquema de idempotencia de asientos:
 * - crea la tabla y pie_informe si una base los tiene a medias
 *   (gestionctp27_qa registró 181800 sin crear los objetos);
 * - agrega claves foráneas. La de asiento_id va NOT VALID para no
 *   rechazar las tres claves huérfanas ya presentes en desarrollo.
 * No borra asientos ni claves.
 */
export class IdempotenciaAsientosIntegridad1819000000000 implements MigrationInterface {
  name = 'IdempotenciaAsientosIntegridad1819000000000';

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

    await queryRunner.query(`
      ALTER TABLE "idempotencia_asientos"
      ALTER COLUMN "asiento_id" SET NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_idempotencia_asiento_responsable'
        ) THEN
          ALTER TABLE "idempotencia_asientos"
            ADD CONSTRAINT "fk_idempotencia_asiento_responsable"
            FOREIGN KEY ("responsable_id") REFERENCES "usuarios"("id")
            ON DELETE RESTRICT;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname IN (
            'fk_idempotencia_asiento',
            'fk_idempotencia_asiento_asiento'
          )
        ) THEN
          ALTER TABLE "idempotencia_asientos"
            ADD CONSTRAINT "fk_idempotencia_asiento"
            FOREIGN KEY ("asiento_id") REFERENCES "asientos_caja"("id")
            ON DELETE CASCADE
            NOT VALID;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "idempotencia_asientos"
      DROP CONSTRAINT IF EXISTS "fk_idempotencia_asiento"
    `);
    await queryRunner.query(`
      ALTER TABLE "idempotencia_asientos"
      DROP CONSTRAINT IF EXISTS "fk_idempotencia_asiento_responsable"
    `);
  }
}
