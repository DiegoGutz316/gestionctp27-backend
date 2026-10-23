import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cuidados de la huerta en un solo formulario y unidad en la siembra.
 *
 * Hasta ahora `tratamientos_agricolas` solo servia para anotar la aplicacion
 * de un producto: producto, cantidad y unidad eran obligatorios. Con eso no se
 * puede registrar un riego ni una limpieza, que son las labores mas frecuentes.
 *
 * Esta migracion:
 * 1. Agrega `actividad` (riego, limpieza, fertilizacion o tratamiento).
 * 2. Afloja producto, tipo, cantidad y unidad, que pasan a exigirse solo
 *    cuando la actividad aplica un producto. La regla vive en el DTO, y aqui
 *    queda un CHECK que impide guardar una fila incoherente por otra via.
 * 3. Agrega la unidad de lo sembrado, que faltaba junto a la cantidad.
 *
 * A las filas existentes se les deduce la actividad por su tipo: lo que era
 * FERTILIZANTE queda como FERTILIZACION y el resto como TRATAMIENTO. Ninguna
 * fila previa era un riego o una limpieza, porque no habia forma de anotarlos.
 */
export class CuidadosAgricolas1818000000000 implements MigrationInterface {
  name = 'CuidadosAgricolas1818000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tratamientos_agricolas"
      ADD COLUMN IF NOT EXISTS "actividad" varchar(20)
    `);

    await queryRunner.query(`
      UPDATE "tratamientos_agricolas"
      SET "actividad" = CASE
        WHEN "tipo" = 'FERTILIZANTE' THEN 'FERTILIZACION'
        ELSE 'TRATAMIENTO'
      END
      WHERE "actividad" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "tratamientos_agricolas"
      ALTER COLUMN "actividad" SET NOT NULL
    `);

    // El producto y su medida dejan de ser obligatorios en la tabla: un riego
    // no los tiene.
    for (const columna of ['tipo', 'producto', 'cantidad', 'unidad']) {
      await queryRunner.query(`
        ALTER TABLE "tratamientos_agricolas"
        ALTER COLUMN "${columna}" DROP NOT NULL
      `);
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'tratamientos_agricolas_actividad_check'
        ) THEN
          ALTER TABLE "tratamientos_agricolas"
          ADD CONSTRAINT "tratamientos_agricolas_actividad_check"
          CHECK (
            "actividad" IN (
              'RIEGO',
              'LIMPIEZA',
              'FERTILIZACION',
              'TRATAMIENTO'
            )
          );
        END IF;
      END
      $$;
    `);

    // Coherencia entre la actividad y el producto: las labores que aplican
    // producto lo exigen con su cantidad y unidad; las que no, no lo admiten.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'tratamientos_agricolas_producto_check'
        ) THEN
          ALTER TABLE "tratamientos_agricolas"
          ADD CONSTRAINT "tratamientos_agricolas_producto_check"
          CHECK (
            CASE
              WHEN "actividad" IN ('FERTILIZACION', 'TRATAMIENTO') THEN
                "producto" IS NOT NULL
                AND btrim("producto") <> ''
                AND "cantidad" IS NOT NULL
                AND "unidad" IS NOT NULL
              ELSE
                "producto" IS NULL
                AND "cantidad" IS NULL
                AND "unidad" IS NULL
                AND "tipo" IS NULL
            END
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "tratamientos_agricolas_actividad_idx"
      ON "tratamientos_agricolas" ("actividad")
    `);

    await queryRunner.query(`
      ALTER TABLE "siembras"
      ADD COLUMN IF NOT EXISTS "unidad_sembrada" varchar(20)
    `);

    // Lo sembrado hasta ahora se conto en unidades: es lo que usa el
    // formulario desde que existe el campo de cantidad.
    await queryRunner.query(`
      UPDATE "siembras"
      SET "unidad_sembrada" = 'UNIDADES'
      WHERE "unidad_sembrada" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "siembras"
      ALTER COLUMN "unidad_sembrada" SET NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'siembras_unidad_sembrada_check'
        ) THEN
          ALTER TABLE "siembras"
          ADD CONSTRAINT "siembras_unidad_sembrada_check"
          CHECK ("unidad_sembrada" IN ('UNIDADES', 'G', 'KG'));
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "siembras"
      DROP CONSTRAINT IF EXISTS "siembras_unidad_sembrada_check"
    `);
    await queryRunner.query(`
      ALTER TABLE "siembras" DROP COLUMN IF EXISTS "unidad_sembrada"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "tratamientos_agricolas_actividad_idx"
    `);
    await queryRunner.query(`
      ALTER TABLE "tratamientos_agricolas"
      DROP CONSTRAINT IF EXISTS "tratamientos_agricolas_producto_check"
    `);
    await queryRunner.query(`
      ALTER TABLE "tratamientos_agricolas"
      DROP CONSTRAINT IF EXISTS "tratamientos_agricolas_actividad_check"
    `);

    // Volver a NOT NULL solo es posible si no quedan riegos ni limpiezas,
    // que son justo las filas que esta migracion hizo posibles.
    await queryRunner.query(`
      DELETE FROM "tratamientos_agricolas"
      WHERE "actividad" IN ('RIEGO', 'LIMPIEZA')
    `);
    for (const columna of ['tipo', 'producto', 'cantidad', 'unidad']) {
      await queryRunner.query(`
        ALTER TABLE "tratamientos_agricolas"
        ALTER COLUMN "${columna}" SET NOT NULL
      `);
    }

    await queryRunner.query(`
      ALTER TABLE "tratamientos_agricolas" DROP COLUMN IF EXISTS "actividad"
    `);
  }
}
