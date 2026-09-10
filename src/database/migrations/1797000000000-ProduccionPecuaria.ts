import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProduccionPecuaria1797000000000 implements MigrationInterface {
  name = 'ProduccionPecuaria1797000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "produccion_pecuaria" (
        "id" serial NOT NULL,
        "animal_id" integer NOT NULL,
        "tipo_produccion" varchar(30) NOT NULL,
        "cantidad" numeric(12,2) NOT NULL,
        "fecha" date NOT NULL,
        "creado_en" timestamptz NOT NULL DEFAULT now(),
        "creado_por" uuid NOT NULL,

        CONSTRAINT "produccion_pecuaria_pk"
          PRIMARY KEY ("id"),

        CONSTRAINT "produccion_pecuaria_cantidad_positiva"
          CHECK ("cantidad" > 0),

        CONSTRAINT "fk_produccion_pecuaria_animal"
          FOREIGN KEY ("animal_id")
          REFERENCES "animales" ("id")
          ON DELETE RESTRICT,

        CONSTRAINT "fk_produccion_pecuaria_creado_por"
          FOREIGN KEY ("creado_por")
          REFERENCES "usuarios" ("id")
          ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "produccion_pecuaria_animal_fecha_idx"
      ON "produccion_pecuaria" ("animal_id", "fecha")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "produccion_pecuaria_animal_fecha_idx"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "produccion_pecuaria"
    `);
  }
}
