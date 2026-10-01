import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El tipo y la unidad son del tratamiento, no de la siembra. Los registros
 * anteriores no los tenían: quedan como fertilizante en kilogramos.
 */
/*
 * Idempotente a proposito: 1811-AsegurarTipoYUnidadTratamiento ya habia
 * creado estas dos columnas y esta fallaba al intentar crearlas de nuevo.
 * Con IF NOT EXISTS sirve igual sobre una base nueva que sobre la actual.
 */
export class TipoYUnidadTratamiento1810000000000 implements MigrationInterface {
  name = 'TipoYUnidadTratamiento1810000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tratamientos_agricolas"
      ADD COLUMN IF NOT EXISTS "tipo" varchar(40) NOT NULL DEFAULT 'FERTILIZANTE',
      ADD COLUMN IF NOT EXISTS "unidad" varchar(20) NOT NULL DEFAULT 'KG'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tratamientos_agricolas"
      DROP COLUMN "unidad",
      DROP COLUMN "tipo"
    `);
  }
}
