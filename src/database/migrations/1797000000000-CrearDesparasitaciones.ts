import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backlog 2.7 (Registrar desparasitaciones).
 *
 * La marca de tiempo va despues de 1796000000000-AsientosCaja, que es la
 * ultima migracion aplicada, para que el orden de ejecucion sea el correcto.
 */
export class CrearDesparasitaciones1797000000000 implements MigrationInterface {
  name = 'CrearDesparasitaciones1797000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "desparasitaciones" (
        "id" serial NOT NULL,
        "animal_id" integer NOT NULL,
        "producto" varchar(120) NOT NULL,
        "fecha" date NOT NULL,
        "observaciones" text,
        "creado_en" timestamptz NOT NULL DEFAULT now(),
        "creado_por" uuid NOT NULL,

        CONSTRAINT "desparasitaciones_pk"
          PRIMARY KEY ("id"),

        -- RESTRICT y no CASCADE: la baja de un animal es logica, asi que su
        -- historial sanitario nunca deberia desaparecer con el.
        CONSTRAINT "fk_desparasitaciones_animal"
          FOREIGN KEY ("animal_id")
          REFERENCES "animales" ("id")
          ON DELETE RESTRICT,

        CONSTRAINT "fk_desparasitaciones_creado_por"
          FOREIGN KEY ("creado_por")
          REFERENCES "usuarios" ("id")
          ON DELETE RESTRICT
      )
    `);

    // Pensado para el backlog 2.8 (consultar desparasitaciones por animal),
    // que las listara por animal y de la mas reciente a la mas antigua.
    await queryRunner.query(`
      CREATE INDEX "desparasitaciones_animal_fecha"
      ON "desparasitaciones" ("animal_id", "fecha" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "desparasitaciones_animal_fecha"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "desparasitaciones"
    `);
  }
}
