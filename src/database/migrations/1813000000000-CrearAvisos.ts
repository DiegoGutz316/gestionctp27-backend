import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backlog 5.5 (Crear avisos institucionales).
 *
 * La marca va despues de 1812000000000-SiembraActivaPorCama, la ultima
 * aplicada, para que el orden de ejecucion sea el correcto.
 */
export class CrearAvisos1813000000000 implements MigrationInterface {
  name = 'CrearAvisos1813000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "avisos" (
        "id" serial NOT NULL,
        "titulo" varchar(150) NOT NULL,
        "descripcion" text NOT NULL,

        -- Fecha a la que se refiere el aviso (la actividad anunciada), que no
        -- es la de creacion: un aviso se publica antes de lo que anuncia.
        "fecha" date NOT NULL,

        "estado" varchar(20) NOT NULL,
        "creado_en" timestamptz NOT NULL DEFAULT now(),
        "creado_por" uuid NOT NULL,

        CONSTRAINT "avisos_pk" PRIMARY KEY ("id"),

        -- "Los campos obligatorios se validan antes de publicar": tambien en
        -- la base, para que ningun otro camino pueda saltarselo.
        CONSTRAINT "avisos_titulo_no_vacio_check"
          CHECK (btrim("titulo") <> ''),

        CONSTRAINT "avisos_descripcion_no_vacia_check"
          CHECK (btrim("descripcion") <> ''),

        CONSTRAINT "avisos_estado_check"
          CHECK ("estado" IN ('ACTIVO', 'INACTIVO')),

        -- RESTRICT: el aviso queda asociado a quien lo creo, y ese vinculo no
        -- debe romperse al dar de baja al usuario.
        CONSTRAINT "fk_avisos_creado_por"
          FOREIGN KEY ("creado_por") REFERENCES "usuarios" ("id")
          ON DELETE RESTRICT
      )
    `);

    // Pensado para el backlog 5.6, que consulta los avisos activos de la
    // fecha mas reciente a la mas antigua.
    await queryRunner.query(`
      CREATE INDEX "avisos_estado_fecha_idx"
      ON "avisos" ("estado", "fecha" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "avisos_estado_fecha_idx"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "avisos"`);
  }
}
