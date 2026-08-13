import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backlog 4.4 (Registrar entradas de inventario) - Task de BD:
 * "Crear tabla de movimientos de inventario".
 *
 * La tabla nace preparada para los dos tipos de movimiento: el 4.4 registra las
 * entradas y el 4.6 reutilizará la misma tabla para las salidas (por eso ya
 * existen la columna `motivo` y el valor SALIDA del enum).
 */
export class MovimientosInventario1787000000000 implements MigrationInterface {
  name = 'MovimientosInventario1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "tipo_movimiento" AS ENUM ('ENTRADA', 'SALIDA')
    `);

    await queryRunner.query(`
      CREATE TABLE "movimientos_inventario" (
        "id"             serial            NOT NULL,
        "insumo_id"      integer           NOT NULL,
        "tipo"           "tipo_movimiento" NOT NULL,
        "cantidad"       numeric(12,2)     NOT NULL,
        "fecha"          date              NOT NULL,
        "origen"         varchar(150),
        "motivo"         varchar(200),
        "responsable_id" uuid              NOT NULL,
        "creado_en"      timestamptz       NOT NULL DEFAULT now(),
        CONSTRAINT "movimientos_inventario_pk" PRIMARY KEY ("id"),
        CONSTRAINT "fk_movimientos_insumo"
          FOREIGN KEY ("insumo_id") REFERENCES "insumos" ("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_movimientos_responsable"
          FOREIGN KEY ("responsable_id") REFERENCES "usuarios" ("id")
          ON DELETE RESTRICT
      )
    `);

    // Criterio "La cantidad ingresada debe ser mayor a cero": el signo lo pone
    // el tipo de movimiento, la cantidad siempre se guarda positiva.
    await queryRunner.query(`
      ALTER TABLE "movimientos_inventario"
      ADD CONSTRAINT "chk_movimientos_cantidad" CHECK ("cantidad" > 0)
    `);

    // Historial por insumo (4.5 y la vista de existencias del 4.7).
    await queryRunner.query(
      `CREATE INDEX "movimientos_insumo_idx" ON "movimientos_inventario" ("insumo_id")`,
    );
    // Listados filtrados por tipo y ordenados por fecha (4.5 consulta entradas).
    await queryRunner.query(
      `CREATE INDEX "movimientos_tipo_fecha_idx" ON "movimientos_inventario" ("tipo", "fecha")`,
    );

    await queryRunner.query(
      `COMMENT ON TABLE "movimientos_inventario" IS 'Backlog 4.4: historial de entradas y salidas. Inmutable: para corregir un error se registra el movimiento contrario.'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "movimientos_inventario"."fecha" IS 'Fecha en que ocurrio el movimiento (la indica el usuario), distinta de creado_en.'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "movimientos_inventario"."origen" IS 'Procedencia del insumo en una entrada (compra, donacion, proveedor). Backlog 4.5.'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "movimientos_inventario"."motivo" IS 'Motivo de la salida. Backlog 4.6.'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "movimientos_tipo_fecha_idx"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "movimientos_insumo_idx"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "movimientos_inventario"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tipo_movimiento"`);
  }
}
