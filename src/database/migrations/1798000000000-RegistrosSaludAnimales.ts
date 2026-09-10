import { MigrationInterface, QueryRunner } from 'typeorm';

export class RegistrosSaludAnimales1798000000000 implements MigrationInterface {
  name = 'RegistrosSaludAnimales1798000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "registros_salud_animales" (
        "id" serial NOT NULL,
        "animal_id" integer NOT NULL,
        "fecha" date NOT NULL,
        "condicion_observada" varchar(30) NOT NULL,
        "diagnostico" varchar(500),
        "observaciones" text,
        "creado_en" timestamptz NOT NULL DEFAULT now(),
        "creado_por" uuid NOT NULL,

        CONSTRAINT "registros_salud_animales_pk"
          PRIMARY KEY ("id"),

        CONSTRAINT "fk_registros_salud_animal"
          FOREIGN KEY ("animal_id")
          REFERENCES "animales" ("id")
          ON DELETE RESTRICT,

        CONSTRAINT "fk_registros_salud_creado_por"
          FOREIGN KEY ("creado_por")
          REFERENCES "usuarios" ("id")
          ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "registros_salud_animal_fecha_idx"
      ON "registros_salud_animales" ("animal_id", "fecha")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "registros_salud_animal_fecha_idx"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "registros_salud_animales"
    `);
  }
}
