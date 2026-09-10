import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backlog 2.5 (Registrar vacunas).
 *
 * La marca de tiempo va despues de 1797000000000-CrearDesparasitaciones, que
 * es la ultima migracion aplicada, para que el orden de ejecucion sea el
 * correcto.
 */
export class CrearVacunas1798000000000 implements MigrationInterface {
  name = 'CrearVacunas1798000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "vacunas" (
        "id" serial NOT NULL,
        "animal_id" integer NOT NULL,
        "tipo_vacuna" varchar(120) NOT NULL,
        "fecha" date NOT NULL,
        "dosis" varchar(50) NOT NULL,
        "observaciones" text,
        "creado_en" timestamptz NOT NULL DEFAULT now(),
        "creado_por" uuid NOT NULL,

        CONSTRAINT "vacunas_pk"
          PRIMARY KEY ("id"),

        -- RESTRICT y no CASCADE: la baja de un animal es logica, asi que su
        -- historial sanitario nunca deberia desaparecer con el.
        CONSTRAINT "fk_vacunas_animal"
          FOREIGN KEY ("animal_id")
          REFERENCES "animales" ("id")
          ON DELETE RESTRICT,

        CONSTRAINT "fk_vacunas_creado_por"
          FOREIGN KEY ("creado_por")
          REFERENCES "usuarios" ("id")
          ON DELETE RESTRICT
      )
    `);

    // Pensado para el backlog 2.6 (consultar vacunas por animal), que las
    // listara por animal y de la mas reciente a la mas antigua.
    await queryRunner.query(`
      CREATE INDEX "vacunas_animal_fecha"
      ON "vacunas" ("animal_id", "fecha" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "vacunas_animal_fecha"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "vacunas"
    `);
  }
}
