import { MigrationInterface, QueryRunner } from 'typeorm';

export class SepararConfiguracionExistencias1791000000000 implements MigrationInterface {
  name = 'SepararConfiguracionExistencias1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_proteger_movimiento_stock" ON "movimientos_stock"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_proteger_cantidad_inventario" ON "inventario"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_aplicar_movimiento_stock" ON "movimientos_stock"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "proteger_movimiento_stock"()`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "proteger_cantidad_inventario"()`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "aplicar_movimiento_stock"()`,
    );

    await queryRunner.query(
      `ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "creado_por" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "actualizado_por" uuid`,
    );
    await queryRunner.query(`
      ALTER TABLE "productos"
      ADD CONSTRAINT "fk_productos_creado_por"
      FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "productos"
      ADD CONSTRAINT "fk_productos_actualizado_por"
      FOREIGN KEY ("actualizado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      CREATE TABLE "configuraciones_stock" (
        "id" serial NOT NULL,
        "producto_id" integer NOT NULL,
        "stock_minimo" numeric(12,2) NOT NULL,
        "precio" numeric(12,2) NOT NULL,
        "activo" boolean NOT NULL DEFAULT true,
        "creado_por" uuid,
        "actualizado_por" uuid,
        "creado_en" timestamptz NOT NULL DEFAULT now(),
        "actualizado_en" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "configuraciones_stock_pk" PRIMARY KEY ("id"),
        CONSTRAINT "uq_configuraciones_stock_producto" UNIQUE ("producto_id"),
        CONSTRAINT "fk_configuraciones_stock_producto" FOREIGN KEY ("producto_id")
          REFERENCES "productos"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_configuraciones_stock_creado_por" FOREIGN KEY ("creado_por")
          REFERENCES "usuarios"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_configuraciones_stock_actualizado_por" FOREIGN KEY ("actualizado_por")
          REFERENCES "usuarios"("id") ON DELETE RESTRICT,
        CONSTRAINT "chk_configuraciones_stock_minimo" CHECK ("stock_minimo" >= 0 AND "stock_minimo" <= 9999999999.99),
        CONSTRAINT "chk_configuraciones_stock_precio" CHECK ("precio" >= 0 AND "precio" <= 9999999999.99)
      )
    `);
    await queryRunner.query(`
      INSERT INTO "configuraciones_stock"
        ("id", "producto_id", "stock_minimo", "precio", "activo", "creado_en", "actualizado_en")
      SELECT "id", "producto_id", "stock_minimo", "precio", "activo", "creado_en", "actualizado_en"
      FROM "inventario"
      ON CONFLICT ("producto_id") DO NOTHING
    `);
    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('configuraciones_stock', 'id'),
        COALESCE((SELECT MAX("id") FROM "configuraciones_stock"), 1),
        EXISTS (SELECT 1 FROM "configuraciones_stock")
      )
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM "configuraciones_stock" c
          JOIN "productos" p ON p."id" = c."producto_id"
          WHERE p."unidad_medida" = 'UNIDAD'
            AND c."stock_minimo" <> trunc(c."stock_minimo")
        ) THEN
          RAISE EXCEPTION 'No se puede migrar: hay productos por unidad con stock mínimo fraccionario.';
        END IF;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE "auditoria_inventario" (
        "id" serial NOT NULL,
        "accion" varchar(20) NOT NULL,
        "recurso" varchar(30) NOT NULL,
        "recurso_id" integer NOT NULL,
        "actor_id" uuid NOT NULL,
        "datos" jsonb NOT NULL,
        "creado_en" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "auditoria_inventario_pk" PRIMARY KEY ("id"),
        CONSTRAINT "fk_auditoria_inventario_actor" FOREIGN KEY ("actor_id")
          REFERENCES "usuarios"("id") ON DELETE RESTRICT,
        CONSTRAINT "chk_auditoria_inventario_accion" CHECK ("accion" IN ('CREAR', 'EDITAR')),
        CONSTRAINT "chk_auditoria_inventario_recurso" CHECK ("recurso" IN ('PRODUCTO', 'CONFIGURACION_STOCK'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "auditoria_inventario_recurso_idx" ON "auditoria_inventario" ("recurso", "recurso_id", "creado_en" DESC)`,
    );

    await queryRunner.query(
      `ALTER TABLE "movimientos_stock" DROP CONSTRAINT IF EXISTS "chk_movimientos_stock_cantidad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "movimientos_stock" ALTER COLUMN "tipo" TYPE varchar(20) USING "tipo"::text`,
    );
    await queryRunner.query(`DROP TYPE "tipo_movimiento_stock"`);
    await queryRunner.query(
      `CREATE TYPE "tipo_movimiento_stock" AS ENUM ('APERTURA', 'AJUSTE', 'ENTRADA', 'SALIDA')`,
    );
    await queryRunner.query(`
      ALTER TABLE "movimientos_stock"
      ALTER COLUMN "tipo" TYPE "tipo_movimiento_stock"
      USING "tipo"::"tipo_movimiento_stock"
    `);
    await queryRunner.query(
      `ALTER TABLE "movimientos_stock" ALTER COLUMN "responsable_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "movimientos_stock" ADD COLUMN "producto_nombre" varchar(120)`,
    );
    await queryRunner.query(
      `ALTER TABLE "movimientos_stock" ADD COLUMN "unidad_medida_snapshot" varchar(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "movimientos_stock" ADD COLUMN "departamento_snapshot" varchar(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "movimientos_stock" ADD COLUMN "precio_unitario" numeric(12,2)`,
    );
    await queryRunner.query(`
      UPDATE "movimientos_stock" m
      SET "producto_nombre" = p."nombre",
          "unidad_medida_snapshot" = p."unidad_medida"::text,
          "departamento_snapshot" = p."departamento"::text,
          "precio_unitario" = c."precio",
          "origen" = CASE WHEN m."tipo" = 'ENTRADA' AND COALESCE(trim(m."origen"), '') = '' THEN 'MIGRACION' ELSE m."origen" END,
          "motivo" = CASE WHEN m."tipo" = 'SALIDA' AND COALESCE(trim(m."motivo"), '') = '' THEN 'MIGRACION' ELSE m."motivo" END
      FROM "inventario" i
      JOIN "productos" p ON p."id" = i."producto_id"
      JOIN "configuraciones_stock" c ON c."producto_id" = p."id"
      WHERE m."inventario_id" = i."id"
    `);
    await queryRunner.query(`
      UPDATE "movimientos_stock"
      SET "motivo" = NULL WHERE "tipo" = 'ENTRADA'
    `);
    await queryRunner.query(`
      UPDATE "movimientos_stock"
      SET "origen" = NULL WHERE "tipo" = 'SALIDA'
    `);

    await queryRunner.query(`
      INSERT INTO "movimientos_stock" (
        "inventario_id", "tipo", "cantidad", "fecha", "origen", "motivo",
        "responsable_id", "producto_nombre", "unidad_medida_snapshot",
        "departamento_snapshot", "precio_unitario", "creado_en"
      )
      SELECT i."id",
        CASE
          WHEN i."cantidad" - COALESCE(m.neto, 0) > 0
            THEN 'APERTURA'::"tipo_movimiento_stock"
          ELSE 'AJUSTE'::"tipo_movimiento_stock"
        END,
        i."cantidad" - COALESCE(m.neto, 0),
        (CURRENT_TIMESTAMP AT TIME ZONE 'America/Costa_Rica')::date,
        NULL, NULL, NULL,
        p."nombre", p."unidad_medida"::text, p."departamento"::text, c."precio", now()
      FROM "inventario" i
      JOIN "productos" p ON p."id" = i."producto_id"
      JOIN "configuraciones_stock" c ON c."producto_id" = p."id"
      LEFT JOIN (
        SELECT "inventario_id",
          COALESCE(SUM(CASE WHEN "tipo" = 'ENTRADA' THEN "cantidad" ELSE -"cantidad" END), 0) AS neto
        FROM "movimientos_stock"
        GROUP BY "inventario_id"
      ) m ON m."inventario_id" = i."id"
      WHERE i."cantidad" - COALESCE(m.neto, 0) <> 0
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM "inventario" i
          LEFT JOIN (
            SELECT "inventario_id",
              COALESCE(SUM(CASE WHEN "tipo" = 'SALIDA' THEN -"cantidad" ELSE "cantidad" END), 0) AS calculado
            FROM "movimientos_stock" GROUP BY "inventario_id"
          ) m ON m."inventario_id" = i."id"
          WHERE i."cantidad" <> COALESCE(m.calculado, 0)
        ) THEN
          RAISE EXCEPTION 'Falló la reconciliación de saldos de inventario.';
        END IF;
      END $$
    `);
    await queryRunner.query(`
      ALTER TABLE "movimientos_stock"
        ALTER COLUMN "producto_nombre" SET NOT NULL,
        ALTER COLUMN "unidad_medida_snapshot" SET NOT NULL,
        ALTER COLUMN "departamento_snapshot" SET NOT NULL,
        ALTER COLUMN "precio_unitario" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "movimientos_stock"
       ADD CONSTRAINT "chk_movimientos_stock_cantidad" CHECK (
         ("tipo" = 'AJUSTE' AND "cantidad" <> 0 AND abs("cantidad") <= 9999999999.99)
         OR ("tipo" <> 'AJUSTE' AND "cantidad" > 0 AND "cantidad" <= 9999999999.99)
       ),
      ADD CONSTRAINT "chk_movimientos_stock_precio" CHECK ("precio_unitario" >= 0 AND "precio_unitario" <= 9999999999.99),
      ADD CONSTRAINT "chk_movimientos_stock_detalle" CHECK (
        ("tipo" = 'ENTRADA' AND COALESCE(trim("origen"), '') <> '' AND "motivo" IS NULL AND "responsable_id" IS NOT NULL)
        OR ("tipo" = 'SALIDA' AND COALESCE(trim("motivo"), '') <> '' AND "origen" IS NULL AND "responsable_id" IS NOT NULL)
        OR ("tipo" IN ('APERTURA', 'AJUSTE') AND "origen" IS NULL AND "motivo" IS NULL AND "responsable_id" IS NULL)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "inventario"
      DROP CONSTRAINT IF EXISTS "chk_inventario_stock_minimo",
      DROP CONSTRAINT IF EXISTS "chk_inventario_precio",
      DROP CONSTRAINT IF EXISTS "chk_inventario_cantidad",
      DROP COLUMN "stock_minimo",
      DROP COLUMN "precio"
    `);
    await queryRunner.query(`
      ALTER TABLE "inventario"
      ADD CONSTRAINT "chk_inventario_cantidad"
      CHECK ("cantidad" >= 0 AND "cantidad" <= 9999999999.99)
    `);

    await queryRunner.query(`
      CREATE TABLE "idempotencia_movimientos_stock" (
        "id" serial NOT NULL,
        "responsable_id" uuid NOT NULL,
        "clave" uuid NOT NULL,
        "huella" char(64) NOT NULL,
        "movimiento_id" integer,
        "creado_en" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "idempotencia_movimientos_stock_pk" PRIMARY KEY ("id"),
        CONSTRAINT "uq_idempotencia_responsable_clave" UNIQUE ("responsable_id", "clave"),
        CONSTRAINT "uq_idempotencia_movimiento" UNIQUE ("movimiento_id"),
        CONSTRAINT "fk_idempotencia_responsable" FOREIGN KEY ("responsable_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_idempotencia_movimiento" FOREIGN KEY ("movimiento_id") REFERENCES "movimientos_stock"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idempotencia_movimientos_creado_idx" ON "idempotencia_movimientos_stock" ("creado_en")`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "movimientos_stock_inventario_idx"`,
    );
    await queryRunner.query(
      `CREATE INDEX "movimientos_stock_inventario_fecha_idx" ON "movimientos_stock" ("inventario_id", "fecha" DESC, "id" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "movimientos_stock_departamento_fecha_idx" ON "movimientos_stock" ("departamento_snapshot", "fecha" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "productos_departamento_activo_idx" ON "productos" ("departamento", "activo")`,
    );

    await queryRunner.query(`
      CREATE FUNCTION "aplicar_movimiento_stock"()
      RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE
        v_unidad text;
        v_producto_nombre varchar(120);
        v_departamento text;
        v_precio numeric(12,2);
      BEGIN
        SELECT p."unidad_medida"::text, p."nombre", p."departamento"::text, c."precio"
          INTO v_unidad, v_producto_nombre, v_departamento, v_precio
        FROM "inventario" i
        JOIN "productos" p ON p."id" = i."producto_id"
        JOIN "configuraciones_stock" c ON c."producto_id" = p."id"
        WHERE i."id" = NEW."inventario_id"
          AND i."activo" = true AND p."activo" = true AND c."activo" = true
        FOR UPDATE OF i, p, c;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'El producto, su configuración o su inventario no existe o está inactivo.' USING ERRCODE = 'P0001';
        END IF;
        IF NEW."fecha" > (CURRENT_TIMESTAMP AT TIME ZONE 'America/Costa_Rica')::date THEN
          RAISE EXCEPTION 'La fecha del movimiento no puede ser futura.' USING ERRCODE = 'P0001';
        END IF;
        IF v_unidad = 'UNIDAD' AND NEW."cantidad" <> trunc(NEW."cantidad") THEN
          RAISE EXCEPTION 'La cantidad debe ser entera para productos por unidad.' USING ERRCODE = 'P0001';
        END IF;

        NEW."producto_nombre" := v_producto_nombre;
        NEW."unidad_medida_snapshot" := v_unidad;
        NEW."departamento_snapshot" := v_departamento;
        NEW."precio_unitario" := v_precio;

        IF NEW."tipo" IN ('APERTURA', 'AJUSTE') THEN
          RAISE EXCEPTION 'Los movimientos de apertura o ajuste solo pueden crearse durante la migración.' USING ERRCODE = 'P0001';
        ELSIF NEW."tipo" = 'ENTRADA' THEN
          UPDATE "inventario"
          SET "cantidad" = "cantidad" + NEW."cantidad", "actualizado_en" = now()
          WHERE "id" = NEW."inventario_id"
            AND "cantidad" + NEW."cantidad" <= 9999999999.99;
          IF NOT FOUND THEN
            RAISE EXCEPTION 'La entrada supera el máximo registrable de stock.' USING ERRCODE = 'P0001';
          END IF;
        ELSE
          UPDATE "inventario"
          SET "cantidad" = "cantidad" - NEW."cantidad", "actualizado_en" = now()
          WHERE "id" = NEW."inventario_id" AND "cantidad" >= NEW."cantidad";
          IF NOT FOUND THEN
            RAISE EXCEPTION 'La salida dejaría la existencia en negativo.' USING ERRCODE = 'P0001';
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
    await queryRunner.query(`
      CREATE FUNCTION "proteger_cantidad_inventario"()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'INSERT' AND NEW."cantidad" <> 0 THEN
          RAISE EXCEPTION 'La existencia inicial debe ser 0; registre una entrada.' USING ERRCODE = 'P0001';
        ELSIF TG_OP = 'UPDATE' AND NEW."cantidad" IS DISTINCT FROM OLD."cantidad" AND pg_trigger_depth() = 1 THEN
          RAISE EXCEPTION 'La existencia solo puede cambiar mediante movimientos.' USING ERRCODE = 'P0001';
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
      CREATE FUNCTION "rechazar_cambio_inmutable"()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'El registro es inmutable.' USING ERRCODE = 'P0001';
      END;
      $$
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_proteger_movimiento_stock"
      BEFORE UPDATE OR DELETE ON "movimientos_stock"
      FOR EACH ROW EXECUTE FUNCTION "rechazar_cambio_inmutable"()
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_proteger_auditoria_inventario"
      BEFORE UPDATE OR DELETE ON "auditoria_inventario"
      FOR EACH ROW EXECUTE FUNCTION "rechazar_cambio_inmutable"()
    `);
    await queryRunner.query(`
      CREATE FUNCTION "validar_configuracion_stock_unidad"()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM "productos" p
          WHERE p."id" = NEW."producto_id"
            AND p."unidad_medida" = 'UNIDAD'
            AND NEW."stock_minimo" <> trunc(NEW."stock_minimo")
        ) THEN
          RAISE EXCEPTION 'El stock mínimo debe ser entero para productos por unidad.' USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
      END;
      $$
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_validar_configuracion_stock_unidad"
      BEFORE INSERT OR UPDATE OF "producto_id", "stock_minimo" ON "configuraciones_stock"
      FOR EACH ROW EXECUTE FUNCTION "validar_configuracion_stock_unidad"()
    `);
    await queryRunner.query(`
      CREATE FUNCTION "validar_cambio_unidad_producto"()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW."unidad_medida" IS DISTINCT FROM OLD."unidad_medida" THEN
          IF EXISTS (
            SELECT 1 FROM "inventario" i
            JOIN "movimientos_stock" m ON m."inventario_id" = i."id"
            WHERE i."producto_id" = NEW."id"
          ) THEN
            RAISE EXCEPTION 'No se puede cambiar la unidad de un producto con movimientos.' USING ERRCODE = '23514';
          END IF;
          IF NEW."unidad_medida" = 'UNIDAD' AND (
            EXISTS (
              SELECT 1 FROM "inventario" i
              WHERE i."producto_id" = NEW."id"
                AND i."cantidad" <> trunc(i."cantidad")
            ) OR EXISTS (
              SELECT 1 FROM "configuraciones_stock" c
              WHERE c."producto_id" = NEW."id"
                AND c."stock_minimo" <> trunc(c."stock_minimo")
            )
          ) THEN
            RAISE EXCEPTION 'El saldo y el stock mínimo deben ser enteros para usar la unidad UNIDAD.' USING ERRCODE = '23514';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_validar_cambio_unidad_producto"
      BEFORE UPDATE OF "unidad_medida" ON "productos"
      FOR EACH ROW EXECUTE FUNCTION "validar_cambio_unidad_producto"()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM "movimientos_stock")
          OR EXISTS (SELECT 1 FROM "auditoria_inventario")
          OR EXISTS (SELECT 1 FROM "idempotencia_movimientos_stock")
          OR EXISTS (SELECT 1 FROM "productos" WHERE "creado_por" IS NOT NULL OR "actualizado_por" IS NOT NULL)
          OR EXISTS (SELECT 1 FROM "configuraciones_stock" WHERE NOT "activo" OR "creado_por" IS NOT NULL OR "actualizado_por" IS NOT NULL)
        THEN
          RAISE EXCEPTION 'Down abortado: existen datos de auditoría, idempotencia, snapshots o configuración que el esquema anterior no puede preservar.';
        END IF;
      END $$
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_proteger_auditoria_inventario" ON "auditoria_inventario"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_proteger_movimiento_stock" ON "movimientos_stock"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_proteger_cantidad_inventario" ON "inventario"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_aplicar_movimiento_stock" ON "movimientos_stock"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_validar_cambio_unidad_producto" ON "productos"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_validar_configuracion_stock_unidad" ON "configuraciones_stock"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "validar_cambio_unidad_producto"()`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "validar_configuracion_stock_unidad"()`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "rechazar_cambio_inmutable"()`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "proteger_cantidad_inventario"()`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "aplicar_movimiento_stock"()`,
    );

    await queryRunner.query(`
      ALTER TABLE "inventario"
      ADD COLUMN "stock_minimo" numeric(12,2),
      ADD COLUMN "precio" numeric(12,2)
    `);
    await queryRunner.query(`
      UPDATE "inventario" i SET
        "stock_minimo" = c."stock_minimo", "precio" = c."precio"
      FROM "configuraciones_stock" c WHERE c."producto_id" = i."producto_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "inventario"
        ALTER COLUMN "stock_minimo" SET NOT NULL,
        ALTER COLUMN "precio" SET NOT NULL,
        DROP CONSTRAINT "chk_inventario_cantidad",
        ADD CONSTRAINT "chk_inventario_cantidad" CHECK ("cantidad" >= 0),
        ADD CONSTRAINT "chk_inventario_stock_minimo" CHECK ("stock_minimo" >= 0),
        ADD CONSTRAINT "chk_inventario_precio" CHECK ("precio" >= 0)
    `);

    await queryRunner.query(`DROP TABLE "idempotencia_movimientos_stock"`);
    await queryRunner.query(`DROP TABLE "auditoria_inventario"`);
    await queryRunner.query(`DROP TABLE "configuraciones_stock"`);
    await queryRunner.query(
      `ALTER TABLE "productos" DROP CONSTRAINT "fk_productos_actualizado_por", DROP CONSTRAINT "fk_productos_creado_por", DROP COLUMN "actualizado_por", DROP COLUMN "creado_por"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "movimientos_stock_departamento_fecha_idx"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "movimientos_stock_inventario_fecha_idx"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "productos_departamento_activo_idx"`,
    );
    await queryRunner.query(
      `CREATE INDEX "movimientos_stock_inventario_idx" ON "movimientos_stock" ("inventario_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "movimientos_stock" DROP CONSTRAINT "chk_movimientos_stock_detalle", DROP CONSTRAINT "chk_movimientos_stock_precio", DROP CONSTRAINT "chk_movimientos_stock_cantidad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "movimientos_stock" DROP COLUMN "precio_unitario", DROP COLUMN "departamento_snapshot", DROP COLUMN "unidad_medida_snapshot", DROP COLUMN "producto_nombre"`,
    );
    await queryRunner.query(
      `ALTER TABLE "movimientos_stock" ALTER COLUMN "responsable_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "movimientos_stock" ALTER COLUMN "tipo" TYPE varchar(20) USING "tipo"::text`,
    );
    await queryRunner.query(`DROP TYPE "tipo_movimiento_stock"`);
    await queryRunner.query(
      `CREATE TYPE "tipo_movimiento_stock" AS ENUM ('ENTRADA', 'SALIDA')`,
    );
    await queryRunner.query(
      `ALTER TABLE "movimientos_stock" ALTER COLUMN "tipo" TYPE "tipo_movimiento_stock" USING "tipo"::"tipo_movimiento_stock"`,
    );
    await queryRunner.query(
      `ALTER TABLE "movimientos_stock" ADD CONSTRAINT "chk_movimientos_stock_cantidad" CHECK ("cantidad" > 0)`,
    );
    await queryRunner.query(`
      CREATE FUNCTION "aplicar_movimiento_stock"()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW."tipo" = 'ENTRADA' THEN
          UPDATE "inventario"
          SET "cantidad" = "cantidad" + NEW."cantidad", "actualizado_en" = now()
          WHERE "id" = NEW."inventario_id" AND "activo" = true
            AND "cantidad" + NEW."cantidad" <= 9999999999.99;
          IF NOT FOUND THEN
            RAISE EXCEPTION 'No se pudo aplicar la entrada de stock.' USING ERRCODE = 'P0001';
          END IF;
        ELSE
          UPDATE "inventario"
          SET "cantidad" = "cantidad" - NEW."cantidad", "actualizado_en" = now()
          WHERE "id" = NEW."inventario_id" AND "activo" = true
            AND "cantidad" >= NEW."cantidad";
          IF NOT FOUND THEN
            RAISE EXCEPTION 'No se pudo aplicar la salida de stock.' USING ERRCODE = 'P0001';
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
    await queryRunner.query(`
      CREATE FUNCTION "proteger_cantidad_inventario"()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'INSERT' AND NEW."cantidad" <> 0 THEN
          RAISE EXCEPTION 'La existencia inicial debe ser 0; registre una entrada.' USING ERRCODE = 'P0001';
        ELSIF TG_OP = 'UPDATE' AND NEW."cantidad" IS DISTINCT FROM OLD."cantidad" AND pg_trigger_depth() = 1 THEN
          RAISE EXCEPTION 'La existencia solo puede cambiar mediante entradas y salidas.' USING ERRCODE = 'P0001';
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
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'Los movimientos de stock son inmutables; registre el movimiento contrario.' USING ERRCODE = 'P0001';
      END;
      $$
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_proteger_movimiento_stock"
      BEFORE UPDATE OR DELETE ON "movimientos_stock"
      FOR EACH ROW EXECUTE FUNCTION "proteger_movimiento_stock"()
    `);
  }
}
