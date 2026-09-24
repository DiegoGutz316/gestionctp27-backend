import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El cultivo actual de una cama es la siembra cuyo ciclo no ha terminado.
 * `finalizada_en` nula marca esa siembra. El índice impide dos ciclos
 * activos en la misma cama.
 */
export class SiembraActivaPorCama1808000000000 implements MigrationInterface {
  name = 'SiembraActivaPorCama1808000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "siembras"
      ADD COLUMN "finalizada_en" date
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "siembras_cama_activa_unica"
      ON "siembras" ("cama_id")
      WHERE "finalizada_en" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "siembras_cama_activa_unica"
    `);
    await queryRunner.query(`
      ALTER TABLE "siembras" DROP COLUMN "finalizada_en"
    `);
  }
}
