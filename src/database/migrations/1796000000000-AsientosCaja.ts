import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Asientos del libro de caja (ingresos y egresos por departamento/periodo).
 * También permite fondo inicial ₡0,00.
 */
export class AsientosCaja1796000000000 implements MigrationInterface {
  name = 'AsientosCaja1796000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fondos_caja" DROP CONSTRAINT IF EXISTS "chk_fondos_caja_monto"`,
    );
    await queryRunner.query(`
      ALTER TABLE "fondos_caja"
      ADD CONSTRAINT "chk_fondos_caja_monto" CHECK (
        "monto_solicitado" IS NULL OR "monto_solicitado" >= 0
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "asientos_caja" (
        "id"              serial         NOT NULL,
        "fondo_id"        integer        NOT NULL,
        "numero"          integer        NOT NULL,
        "fecha"           date           NOT NULL,
        "numero_factura"  varchar(40)    NOT NULL DEFAULT '',
        "descripcion"     varchar(250)   NOT NULL,
        "ingresos"        numeric(12,2)  NOT NULL DEFAULT 0,
        "egresos"         numeric(12,2)  NOT NULL DEFAULT 0,
        "creado_en"       timestamptz    NOT NULL DEFAULT now(),
        "actualizado_en"  timestamptz    NOT NULL DEFAULT now(),
        "creado_por"      uuid,
        CONSTRAINT "asientos_caja_pk" PRIMARY KEY ("id"),
        CONSTRAINT "fk_asientos_caja_fondo"
          FOREIGN KEY ("fondo_id") REFERENCES "fondos_caja" ("id")
          ON DELETE RESTRICT,
        CONSTRAINT "chk_asientos_caja_numero" CHECK ("numero" > 0),
        CONSTRAINT "chk_asientos_caja_montos" CHECK (
          "ingresos" >= 0
          AND "egresos" >= 0
          AND (
            ("ingresos" > 0 AND "egresos" = 0)
            OR ("egresos" > 0 AND "ingresos" = 0)
          )
        )
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "asientos_caja_fondo_numero_uq" ON "asientos_caja" ("fondo_id", "numero")`,
    );
    await queryRunner.query(
      `CREATE INDEX "asientos_caja_fondo_fecha_idx" ON "asientos_caja" ("fondo_id", "fecha")`,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "asientos_caja" IS 'Movimientos de ingresos y egresos del libro de caja. El saldo se calcula, no se guarda.'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "asientos_caja"`);
    await queryRunner.query(
      `ALTER TABLE "fondos_caja" DROP CONSTRAINT IF EXISTS "chk_fondos_caja_monto"`,
    );
    await queryRunner.query(`
      ALTER TABLE "fondos_caja"
      ADD CONSTRAINT "chk_fondos_caja_monto" CHECK (
        "monto_solicitado" IS NULL OR "monto_solicitado" > 0
      )
    `);
  }
}
