import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backlog de Gestión Agrícola (Registrar camas de cultivo).
 *
 * La marca de tiempo va despues de 1801000000000-CategoriaBovinaDeAnimalesExistentes,
 * que es la ultima migracion aplicada, para que el orden de ejecucion sea el
 * correcto.
 */
export class CrearCamasCultivo1802000000000 implements MigrationInterface {
  name = 'CrearCamasCultivo1802000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "camas_cultivo" (
        "id" serial NOT NULL,
        "codigo" varchar(50) NOT NULL,
        "ubicacion" varchar(120) NOT NULL,
        "estado" varchar(50) NOT NULL,
        "observaciones" text,
        "creado_en" timestamptz NOT NULL DEFAULT now(),
        "creado_por" uuid NOT NULL,
        "actualizado_en" timestamptz NOT NULL DEFAULT now(),
        "actualizado_por" uuid,

        CONSTRAINT "camas_cultivo_pk"
          PRIMARY KEY ("id"),

        CONSTRAINT "fk_camas_cultivo_creado_por"
          FOREIGN KEY ("creado_por")
          REFERENCES "usuarios" ("id")
          ON DELETE RESTRICT,

        CONSTRAINT "fk_camas_cultivo_actualizado_por"
          FOREIGN KEY ("actualizado_por")
          REFERENCES "usuarios" ("id")
          ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "camas_cultivo_codigo_unico"
      ON "camas_cultivo" ("codigo")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "camas_cultivo_codigo_unico"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "camas_cultivo"
    `);
  }
}
