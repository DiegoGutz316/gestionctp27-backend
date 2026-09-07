import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearAnimales1788812595395 implements MigrationInterface {
  name = 'CrearAnimales1788812595395';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "animales" (
        "id" serial NOT NULL,
        "codigo" varchar(50) NOT NULL,
        "nombre" varchar(120) NOT NULL,
        "especie" varchar(80) NOT NULL,
        "raza" varchar(100) NOT NULL,
        "fecha_nacimiento" date NOT NULL,
        "estado" varchar(50) NOT NULL,
        "observaciones" text,
        "creado_en" timestamptz NOT NULL DEFAULT now(),
        "creado_por" uuid NOT NULL,

        CONSTRAINT "animales_pk"
          PRIMARY KEY ("id"),

        CONSTRAINT "fk_animales_creado_por"
          FOREIGN KEY ("creado_por")
          REFERENCES "usuarios" ("id")
          ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "animales_codigo_unico"
      ON "animales" ("codigo")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "animales_codigo_unico"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "animales"
    `);
  }
}
