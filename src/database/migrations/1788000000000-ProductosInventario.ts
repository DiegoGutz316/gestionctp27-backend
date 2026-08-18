import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reemplaza el esquema anterior de inventario (categorias_insumo, insumos,
 * movimientos_inventario) por el modelo Producto -> Inventario: un catálogo
 * de productos (tipo, unidad de medida, departamento, ubicación) del que
 * cuelga el stock.
 *
 * No se preservan los datos ni el historial de movimientos de las tablas
 * anteriores.
 */
export class ProductosInventario1788000000000 implements MigrationInterface {
  name = 'ProductosInventario1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "movimientos_inventario"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tipo_movimiento"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "insumos"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categorias_insumo"`);

    await queryRunner.query(
      `CREATE TYPE "tipo_producto" AS ENUM ('INSUMO', 'HERRAMIENTA', 'EQUIPO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "unidad_medida" AS ENUM ('GRANEL', 'UNIDAD')`,
    );
    await queryRunner.query(
      `CREATE TYPE "departamento" AS ENUM ('AGRICOLA', 'PECUARIO', 'GENERAL')`,
    );
    await queryRunner.query(
      `CREATE TYPE "ubicacion" AS ENUM ('BODEGA_CENTRAL', 'BODEGA_AGRICOLA', 'BODEGA_PECUARIA', 'TALLER')`,
    );

    await queryRunner.query(`
      CREATE TABLE "productos" (
        "id"               serial            NOT NULL,
        "nombre"           varchar(120)      NOT NULL,
        "tipo_producto"    "tipo_producto"   NOT NULL,
        "unidad_medida"    "unidad_medida"   NOT NULL,
        "departamento"     "departamento"    NOT NULL,
        "ubicacion"        "ubicacion"       NOT NULL,
        "activo"           boolean           NOT NULL DEFAULT true,
        "creado_en"        timestamptz       NOT NULL DEFAULT now(),
        "actualizado_en"   timestamptz       NOT NULL DEFAULT now(),
        CONSTRAINT "productos_pk" PRIMARY KEY ("id")
      )
    `);

    // Índice único de expresión (case-insensitive), parcial sobre registros
    // activos para que la eliminación lógica no bloquee recrear un nombre.
    // Se mantiene a mano (synchronize:false en la entidad).
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_productos_nombre" ON "productos" (lower("nombre")) WHERE "activo" = true`,
    );

    await queryRunner.query(`
      CREATE TABLE "inventario" (
        "id"               serial            NOT NULL,
        "producto_id"      integer           NOT NULL,
        "cantidad"         numeric(12,2)     NOT NULL DEFAULT '0',
        "stock_minimo"     numeric(12,2)     NOT NULL DEFAULT '0',
        "precio"           numeric(12,2)     NOT NULL,
        "activo"           boolean           NOT NULL DEFAULT true,
        "creado_en"        timestamptz       NOT NULL DEFAULT now(),
        "actualizado_en"   timestamptz       NOT NULL DEFAULT now(),
        CONSTRAINT "inventario_pk" PRIMARY KEY ("id"),
        CONSTRAINT "uq_inventario_producto" UNIQUE ("producto_id"),
        CONSTRAINT "fk_inventario_producto"
          FOREIGN KEY ("producto_id") REFERENCES "productos" ("id")
          ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "inventario" ADD CONSTRAINT "chk_inventario_cantidad" CHECK ("cantidad" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventario" ADD CONSTRAINT "chk_inventario_stock_minimo" CHECK ("stock_minimo" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventario" ADD CONSTRAINT "chk_inventario_precio" CHECK ("precio" >= 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "inventario"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_productos_nombre"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "productos"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "ubicacion"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "departamento"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "unidad_medida"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tipo_producto"`);

    // Recrea el esquema anterior (estructura únicamente; no restaura datos).
    await queryRunner.query(
      `CREATE TABLE "categorias_insumo" ("id" SERIAL NOT NULL, "nombre" character varying(60) NOT NULL, "activo" boolean NOT NULL DEFAULT true, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f84eef80a3339fd765bb6035d20" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "insumos" ("id" SERIAL NOT NULL, "nombre" character varying(120) NOT NULL, "unidad_medida" character varying(10) NOT NULL, "cantidad" numeric(12,2) NOT NULL, "nivel_minimo" numeric(12,2) NOT NULL DEFAULT '0', "activo" boolean NOT NULL DEFAULT true, "creado_por" uuid, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "categoria_id" integer NOT NULL, CONSTRAINT "PK_b4e1b727a7b140e698e3a3dc7af" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "insumos" ADD CONSTRAINT "FK_998362c3f6fd2e8f4b19aa4d5da" FOREIGN KEY ("categoria_id") REFERENCES "categorias_insumo"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_categorias_insumo_nombre" ON "categorias_insumo" (lower("nombre")) WHERE "activo" = true`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_insumos_nombre_categoria" ON "insumos" (lower("nombre"), "categoria_id") WHERE "activo" = true`,
    );
    await queryRunner.query(
      `ALTER TABLE "insumos" ADD CONSTRAINT "chk_insumos_cantidad" CHECK ("cantidad" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "insumos" ADD CONSTRAINT "chk_insumos_nivel_minimo" CHECK ("nivel_minimo" >= 0)`,
    );

    await queryRunner.query(
      `CREATE TYPE "tipo_movimiento" AS ENUM ('ENTRADA', 'SALIDA')`,
    );
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
    await queryRunner.query(
      `ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "chk_movimientos_cantidad" CHECK ("cantidad" > 0)`,
    );
    await queryRunner.query(
      `CREATE INDEX "movimientos_insumo_idx" ON "movimientos_inventario" ("insumo_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "movimientos_tipo_fecha_idx" ON "movimientos_inventario" ("tipo", "fecha")`,
    );
  }
}
