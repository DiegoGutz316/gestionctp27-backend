import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearSiembras1803000000000 implements MigrationInterface {
  name = 'CrearSiembras1803000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "siembras" (
        "id" serial NOT NULL,
        "cama_id" integer NOT NULL,
        "tipo_cultivo" varchar(120) NOT NULL,
        "fecha_siembra" date NOT NULL,
        "cantidad_sembrada" numeric(12,2) NOT NULL,
        "creado_en" timestamptz NOT NULL DEFAULT now(),
        "creado_por" uuid NOT NULL,

        CONSTRAINT "siembras_pk" PRIMARY KEY ("id"),
        CONSTRAINT "siembras_cantidad_positiva_check"
          CHECK ("cantidad_sembrada" > 0),
        CONSTRAINT "fk_siembras_cama"
          FOREIGN KEY ("cama_id") REFERENCES "camas_cultivo" ("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_siembras_creado_por"
          FOREIGN KEY ("creado_por") REFERENCES "usuarios" ("id")
          ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "siembras_cama_fecha_idx"
      ON "siembras" ("cama_id", "fecha_siembra")
    `);
    await queryRunner.query(`
      CREATE INDEX "siembras_cultivo_idx"
      ON "siembras" ("tipo_cultivo")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "siembras"');
  }
}
