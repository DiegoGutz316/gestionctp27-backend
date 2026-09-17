import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTratamientosAgricolas1805000000000 implements MigrationInterface {
  name = 'CrearTratamientosAgricolas1805000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tratamientos_agricolas" (
        "id" serial NOT NULL,
        "siembra_id" integer NOT NULL,
        "producto" varchar(120) NOT NULL,
        "fecha" date NOT NULL,
        "cantidad" numeric(12,2) NOT NULL,
        "observaciones" text,
        "creado_en" timestamptz NOT NULL DEFAULT now(),
        "creado_por" uuid NOT NULL,

        CONSTRAINT "tratamientos_agricolas_pk"
          PRIMARY KEY ("id"),

        CONSTRAINT "tratamientos_agricolas_cantidad_positiva_check"
          CHECK ("cantidad" > 0),

        CONSTRAINT "fk_tratamientos_agricolas_siembra"
          FOREIGN KEY ("siembra_id")
          REFERENCES "siembras" ("id")
          ON DELETE RESTRICT,

        CONSTRAINT "fk_tratamientos_agricolas_creado_por"
          FOREIGN KEY ("creado_por")
          REFERENCES "usuarios" ("id")
          ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "tratamientos_agricolas_siembra_fecha_idx"
      ON "tratamientos_agricolas"
      ("siembra_id", "fecha")
    `);

    await queryRunner.query(`
      CREATE INDEX "tratamientos_agricolas_producto_idx"
      ON "tratamientos_agricolas"
      ("producto")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "tratamientos_agricolas"
    `);
  }
}
