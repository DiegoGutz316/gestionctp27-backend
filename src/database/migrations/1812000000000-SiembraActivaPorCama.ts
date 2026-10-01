import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El cultivo actual de una cama es la siembra cuyo ciclo no ha terminado.
 * `finalizada_en` nula marca esa siembra. El indice impide dos ciclos
 * activos en la misma cama.
 *
 * La marca era 1808000000000, la misma que 1808-FinalizadaEnSiembras, que ya
 * estaba aplicada y habia creado la columna. Dos migraciones con la misma
 * marca dejan su orden relativo indefinido, y esta fallaba al intentar crear
 * una columna existente. Se renumero a 1812 —despues de la ultima aplicada—
 * y se volvio idempotente: sirve igual sobre una base nueva que sobre la que
 * ya tiene la columna.
 */
export class SiembraActivaPorCama1812000000000 implements MigrationInterface {
  name = 'SiembraActivaPorCama1812000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // En una base nueva la columna no existe; en la actual la creo
    // 1808-FinalizadaEnSiembras.
    await queryRunner.query(`
      ALTER TABLE "siembras"
      ADD COLUMN IF NOT EXISTS "finalizada_en" date
    `);

    // Aquella la creo como timestamptz, pero el codigo escribe la fecha del
    // dia en texto (AAAA-MM-DD) y la entidad la declara `date`: se alinea el
    // tipo con lo que la aplicacion usa de verdad.
    await queryRunner.query(`
      ALTER TABLE "siembras"
      ALTER COLUMN "finalizada_en" TYPE date
      USING "finalizada_en"::date
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "siembras_cama_activa_unica"
      ON "siembras" ("cama_id")
      WHERE "finalizada_en" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "siembras_cama_activa_unica"
    `);

    // La columna no se borra: la crea 1808-FinalizadaEnSiembras y revertir
    // esta migracion no deberia llevarsela. Solo se devuelve su tipo.
    await queryRunner.query(`
      ALTER TABLE "siembras"
      ALTER COLUMN "finalizada_en" TYPE timestamptz
      USING "finalizada_en"::timestamptz
    `);
  }
}
