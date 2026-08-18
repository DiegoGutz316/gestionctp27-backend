import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Historial de entradas/salidas de stock (ver `stock/entities/movimiento-stock.entity.ts`).
 * `inventario.cantidad` deja de fijarse al crear el lote: nace en 0 y solo
 * cambia registrando movimientos.
 */
export class MovimientosStock1790000000000 implements MigrationInterface {
  name = 'MovimientosStock1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "tipo_movimiento_stock" AS ENUM ('ENTRADA', 'SALIDA')`,
    );

    await queryRunner.query(`
      CREATE TABLE "movimientos_stock" (
        "id"             serial                  NOT NULL,
        "inventario_id"  integer                 NOT NULL,
        "tipo"           "tipo_movimiento_stock" NOT NULL,
        "cantidad"       numeric(12,2)           NOT NULL,
        "fecha"          date                    NOT NULL,
        "origen"         varchar(150),
        "motivo"         varchar(200),
        "responsable_id" uuid                    NOT NULL,
        "creado_en"      timestamptz             NOT NULL DEFAULT now(),
        CONSTRAINT "movimientos_stock_pk" PRIMARY KEY ("id"),
        CONSTRAINT "fk_movimientos_stock_inventario"
          FOREIGN KEY ("inventario_id") REFERENCES "inventario" ("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_movimientos_stock_responsable"
          FOREIGN KEY ("responsable_id") REFERENCES "usuarios" ("id")
          ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "movimientos_stock" ADD CONSTRAINT "chk_movimientos_stock_cantidad" CHECK ("cantidad" > 0)`,
    );
    await queryRunner.query(
      `CREATE INDEX "movimientos_stock_inventario_idx" ON "movimientos_stock" ("inventario_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "movimientos_stock_tipo_fecha_idx" ON "movimientos_stock" ("tipo", "fecha")`,
    );

    // El movimiento es la única puerta para modificar la existencia. El
    // trigger actualiza y valida el stock dentro de la misma transacción que
    // inserta el historial, incluso si el movimiento no viene desde Nest.
    await queryRunner.query(`
      CREATE FUNCTION "aplicar_movimiento_stock"()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW."tipo" = 'ENTRADA' THEN
          UPDATE "inventario"
          SET "cantidad" = "cantidad" + NEW."cantidad",
              "actualizado_en" = now()
          WHERE "id" = NEW."inventario_id"
            AND "activo" = true
            AND "cantidad" + NEW."cantidad" <= 9999999999.99;

          IF NOT FOUND THEN
            IF EXISTS (
              SELECT 1 FROM "inventario"
              WHERE "id" = NEW."inventario_id" AND "activo" = true
            ) THEN
              RAISE EXCEPTION 'La entrada supera el máximo registrable de stock.'
                USING ERRCODE = 'P0001';
            END IF;

            RAISE EXCEPTION 'El registro de inventario no existe o está inactivo.'
              USING ERRCODE = 'P0001';
          END IF;
        ELSE
          UPDATE "inventario"
          SET "cantidad" = "cantidad" - NEW."cantidad",
              "actualizado_en" = now()
          WHERE "id" = NEW."inventario_id"
            AND "activo" = true
            AND "cantidad" >= NEW."cantidad";

          IF NOT FOUND THEN
            IF EXISTS (
              SELECT 1 FROM "inventario"
              WHERE "id" = NEW."inventario_id" AND "activo" = true
            ) THEN
              RAISE EXCEPTION 'La salida dejaría la existencia en negativo.'
                USING ERRCODE = 'P0001';
            END IF;

            RAISE EXCEPTION 'El registro de inventario no existe o está inactivo.'
              USING ERRCODE = 'P0001';
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_aplicar_movimiento_stock"
      BEFORE INSERT ON "movimientos_stock"
      FOR EACH ROW EXECUTE FUNCTION "aplicar_movimiento_stock"()
    `);

    // Una actualización directa llega con profundidad 1. La actualización
    // anidada disparada por aplicar_movimiento_stock llega con profundidad 2.
    await queryRunner.query(`
      CREATE FUNCTION "proteger_cantidad_inventario"()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF TG_OP = 'INSERT' AND NEW."cantidad" <> 0 THEN
          RAISE EXCEPTION 'La existencia inicial debe ser 0; registre una entrada.'
            USING ERRCODE = 'P0001';
        ELSIF TG_OP = 'UPDATE'
          AND NEW."cantidad" IS DISTINCT FROM OLD."cantidad"
          AND pg_trigger_depth() = 1 THEN
          RAISE EXCEPTION 'La existencia solo puede cambiar mediante entradas y salidas.'
            USING ERRCODE = 'P0001';
        END IF;
        RETURN NEW;
      END;
      $$
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_proteger_cantidad_inventario"
      BEFORE INSERT OR UPDATE OF "cantidad" ON "inventario"
      FOR EACH ROW EXECUTE FUNCTION "proteger_cantidad_inventario"()
    `);

    await queryRunner.query(`
      CREATE FUNCTION "proteger_movimiento_stock"()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RAISE EXCEPTION 'Los movimientos de stock son inmutables; registre el movimiento contrario.'
          USING ERRCODE = 'P0001';
      END;
      $$
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_proteger_movimiento_stock"
      BEFORE UPDATE OR DELETE ON "movimientos_stock"
      FOR EACH ROW EXECUTE FUNCTION "proteger_movimiento_stock"()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_proteger_movimiento_stock" ON "movimientos_stock"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "proteger_movimiento_stock"()`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_proteger_cantidad_inventario" ON "inventario"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "proteger_cantidad_inventario"()`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_aplicar_movimiento_stock" ON "movimientos_stock"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "aplicar_movimiento_stock"()`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "movimientos_stock_tipo_fecha_idx"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "movimientos_stock_inventario_idx"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "movimientos_stock"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tipo_movimiento_stock"`);
  }
}
