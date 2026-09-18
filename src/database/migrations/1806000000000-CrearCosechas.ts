import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backlog 3.6 (Registrar cosechas).
 *
 * La marca va despues de 1805000000000-CrearTratamientosAgricolas, la ultima
 * aplicada, para que el orden de ejecucion sea el correcto.
 */
export class CrearCosechas1806000000000 implements MigrationInterface {
  name = 'CrearCosechas1806000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cosechas" (
        "id" serial NOT NULL,
        "siembra_id" integer NOT NULL,
        "fecha" date NOT NULL,
        "cantidad_obtenida" numeric(12,2) NOT NULL,
        "observaciones" text,
        "creado_en" timestamptz NOT NULL DEFAULT now(),
        "creado_por" uuid NOT NULL,

        CONSTRAINT "cosechas_pk" PRIMARY KEY ("id"),

        -- "La cantidad obtenida debe ser mayor a cero": tambien en la base, no
        -- solo en el DTO, para que ningun otro camino pueda saltarselo.
        CONSTRAINT "cosechas_cantidad_positiva_check"
          CHECK ("cantidad_obtenida" > 0),

        -- RESTRICT: el historial de produccion no debe desaparecer con la
        -- siembra, igual que en siembras y tratamientos.
        CONSTRAINT "fk_cosechas_siembra"
          FOREIGN KEY ("siembra_id") REFERENCES "siembras" ("id")
          ON DELETE RESTRICT,

        CONSTRAINT "fk_cosechas_creado_por"
          FOREIGN KEY ("creado_por") REFERENCES "usuarios" ("id")
          ON DELETE RESTRICT
      )
    `);

    // Pensado para el backlog 3.7, que consulta por siembra y ordena de la
    // cosecha mas reciente a la mas antigua.
    await queryRunner.query(`
      CREATE INDEX "cosechas_siembra_fecha_idx"
      ON "cosechas" ("siembra_id", "fecha" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "cosechas_siembra_fecha_idx"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "cosechas"
    `);
  }
}
