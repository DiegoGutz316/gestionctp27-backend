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

    /**
     * Antes de instalar la restriccion hay que poner la base en un estado que
     * la cumpla. Hasta ahora nada impedia dos ciclos abiertos en la misma
     * cama: `SiembraService.registrar` comprueba y luego inserta, y entre esos
     * dos pasos cabe otra peticion. Con duplicados, `CREATE UNIQUE INDEX`
     * falla y se lleva la migracion entera por delante.
     *
     * De cada cama se conserva un solo ciclo abierto y se cierran los demas.
     * No se borra ninguna fila: de una siembra cuelgan cosechas y
     * tratamientos.
     *
     * Cual se conserva: primero el que tenga produccion registrada, porque
     * cerrar un ciclo del que ya se cosecho seria afirmar que termino cuando
     * en realidad esta en uso. Entre los que empatan, el mas reciente. Si
     * ninguno tiene cosechas —el caso tipico de dos peticiones a la vez— se
     * queda el mas reciente.
     *
     * La fecha de cierre es la de su ultima cosecha, que es cuando se vio esa
     * siembra activa por ultima vez; si nunca se cosecho, la de su siembra.
     *
     * Ninguna eleccion automatica acierta siempre, asi que queda registrada
     * en `motivo_detalle`: desde la pantalla se puede corregir.
     */
    await queryRunner.query(`
      WITH abiertas AS (
        SELECT
          s."id",
          s."cama_id",
          s."fecha_siembra",
          (SELECT COUNT(*) FROM "cosechas" c WHERE c."siembra_id" = s."id")
            AS "cosechas"
        FROM "siembras" s
        WHERE s."finalizada_en" IS NULL
      ),
      activas AS (
        SELECT
          "id",
          ROW_NUMBER() OVER (
            PARTITION BY "cama_id"
            ORDER BY "cosechas" DESC, "fecha_siembra" DESC, "id" DESC
          ) AS "orden"
        FROM abiertas
      )
      UPDATE "siembras" s
      SET
        "finalizada_en" = COALESCE(
          (SELECT MAX(c."fecha") FROM "cosechas" c WHERE c."siembra_id" = s."id"),
          s."fecha_siembra"
        ),
        "motivo_finalizacion" = 'OTRO',
        "motivo_detalle" =
          'Cerrada al instalar la regla de una siembra activa por cama: la cama tenía más de un ciclo abierto.'
      FROM activas a
      WHERE a."id" = s."id" AND a."orden" > 1
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
