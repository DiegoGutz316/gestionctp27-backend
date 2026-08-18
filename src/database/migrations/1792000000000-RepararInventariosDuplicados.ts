import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Repara bases donde se perdió la unicidad de inventario.producto_id. Solo
 * elimina duplicados vacíos y sin historial; cualquier caso ambiguo aborta la
 * migración para evitar combinar saldos de forma silenciosa.
 */
export class RepararInventariosDuplicados1792000000000 implements MigrationInterface {
  name = 'RepararInventariosDuplicados1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`LOCK TABLE "inventario" IN ACCESS EXCLUSIVE MODE`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM "inventario" i
          LEFT JOIN (
            SELECT DISTINCT "inventario_id"
            FROM "movimientos_stock"
          ) m ON m."inventario_id" = i."id"
          GROUP BY i."producto_id"
          HAVING count(*) > 1
            AND count(*) FILTER (
              WHERE i."cantidad" <> 0 OR m."inventario_id" IS NOT NULL
            ) > 1
        ) THEN
          RAISE EXCEPTION 'Hay productos con más de un inventario que contiene saldo o movimientos; se requiere conciliación manual.';
        END IF;
      END $$
    `);

    await queryRunner.query(`
      WITH clasificados AS (
        SELECT
          i."id",
          i."cantidad",
          EXISTS (
            SELECT 1
            FROM "movimientos_stock" m
            WHERE m."inventario_id" = i."id"
          ) AS tiene_movimientos,
          row_number() OVER (
            PARTITION BY i."producto_id"
            ORDER BY
              EXISTS (
                SELECT 1
                FROM "movimientos_stock" m
                WHERE m."inventario_id" = i."id"
              ) DESC,
              (i."cantidad" <> 0) DESC,
              i."id" ASC
          ) AS posicion
        FROM "inventario" i
      )
      DELETE FROM "inventario" i
      USING clasificados c
      WHERE i."id" = c."id"
        AND c.posicion > 1
        AND c."cantidad" = 0
        AND NOT c.tiene_movimientos
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM "inventario"
          GROUP BY "producto_id"
          HAVING count(*) > 1
        ) THEN
          RAISE EXCEPTION 'Persisten inventarios duplicados después de la reparación segura.';
        END IF;
      END $$
    `);

    // La restricción se crea solo si falta. En las bases que esta migración
    // viene a reparar no existe, pero en una que corre la cadena desde cero ya
    // la trae la migración 1788 al crear la tabla, y un ADD CONSTRAINT directo
    // aborta con "relation ya existe" dejando toda la cadena sin aplicar.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_inventario_producto'
        ) THEN
          ALTER TABLE "inventario"
          ADD CONSTRAINT "uq_inventario_producto" UNIQUE ("producto_id");
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "inventario"
      DROP CONSTRAINT IF EXISTS "uq_inventario_producto"
    `);
  }
}
