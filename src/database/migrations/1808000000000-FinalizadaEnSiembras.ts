import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marca el cierre del ciclo de una siembra.
 *
 * Mientras es null, ese cultivo es el actual de la cama. Al registrar una
 * cosecha que cierra el ciclo, deja de mostrarse en el listado.
 */
export class FinalizadaEnSiembras1808000000000 implements MigrationInterface {
  name = 'FinalizadaEnSiembras1808000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "siembras"
      ADD COLUMN IF NOT EXISTS "finalizada_en" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "siembras"
      DROP COLUMN IF EXISTS "finalizada_en"
    `);
  }
}
